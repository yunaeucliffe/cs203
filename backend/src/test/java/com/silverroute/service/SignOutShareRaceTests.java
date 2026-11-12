package com.silverroute.service;

import static org.assertj.core.api.Assertions.*;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.silverroute.controller.AuthController;
import com.silverroute.model.User;
import com.silverroute.repository.UserRepository;

/**
 * Sign-out against share creation from another tab, on the configured PostgreSQL database like
 * AccountDeletionTests. Sessions live in Spring Session's table, so each test stores a real session row.
 */
@SpringBootTest
@ActiveProfiles("mock")
class SignOutShareRaceTests {
    @Autowired TripShareService service;
    @Autowired AuthController auth;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    final ExecutorService threads = Executors.newFixedThreadPool(3);
    final String sessionId = UUID.randomUUID().toString();
    final MockHttpSession session = new MockHttpSession(null, sessionId);
    final TripShareService.Create trip =
            new TripShareService.Create("Home", "Clinic", "Bus 10", Instant.now().plusSeconds(900), true);
    String email;

    @BeforeEach void setup() {
        String name = "race-" + UUID.randomUUID();
        email = name + "@example.com";
        users.save(new User("Race test", name, email, "unused"));
        long now = System.currentTimeMillis();
        jdbc.update("insert into spring_session (primary_id, session_id, creation_time, last_access_time, "
                + "max_inactive_interval, expiry_time, principal_name) values (?, ?, ?, ?, 1800, ?, ?)",
                UUID.randomUUID().toString(), sessionId, now, now, now + 1_800_000, email);
    }
    @AfterEach void cleanup() {
        threads.shutdownNow();
        jdbc.update("delete from spring_session where session_id = ?", sessionId);
        jdbc.update("delete from users where email = ?", email); // cascades to trip_shares
    }

    void signOut() {
        var request = new MockHttpServletRequest();
        request.setSession(session);
        auth.logout(UsernamePasswordAuthenticationToken.authenticated(email, null, List.of()),
                request, new MockHttpServletResponse());
    }
    boolean sessionStored() {
        return jdbc.queryForObject("select count(*) from spring_session where session_id = ?", Integer.class, sessionId) == 1;
    }

    @Test void createFromAnotherTabDuringSignOutIsRejected() throws Exception {
        var existing = service.create(email, trip, sessionId);
        // Hold sign-out mid-transaction: it has the user lock and is waiting to revoke this row.
        var held = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        Future<?> holder = threads.submit(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            jdbc.queryForList("select id from trip_shares where id = ? for update", existing.id());
            held.countDown();
            await(release);
        }));
        assertThat(held.await(10, TimeUnit.SECONDS)).isTrue();
        Future<?> signOut = threads.submit(this::signOut);
        waitForBlockedTransactions(1);

        // Authenticated before sign-out began, so it gets past security, but must queue behind sign-out.
        Future<?> create = threads.submit(() -> service.create(email, trip, sessionId));
        waitForBlockedTransactions(2);
        release.countDown();

        holder.get(10, TimeUnit.SECONDS);
        signOut.get(10, TimeUnit.SECONDS);
        assertThatThrownBy(() -> create.get(10, TimeUnit.SECONDS)).cause()
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(401));
        assertThat(service.active(email)).isEmpty();
        assertThat(sessionStored()).isFalse();
    }

    @Test void failedSignOutKeepsBothSharesAndSession() {
        service.create(email, trip, sessionId);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            service.signOut(email, sessionId);
            status.setRollbackOnly(); // as if the commit failed
        });
        assertThat(service.active(email)).hasSize(1);
        assertThat(sessionStored()).isTrue();
    }

    @Test void signOutRevokesSharesWithTheirLocationAndEndsTheSession() {
        var share = service.create(email, trip, sessionId);
        service.update(email, share.id(), new TripShareService.Location(1.3, 103.8));
        signOut();
        assertThat(service.active(email)).isEmpty();
        assertThatThrownBy(() -> service.read(share.token())).hasMessageContaining("invalid or has ended");
        assertThat(jdbc.queryForObject("select count(*) from trip_shares where id = ? and latitude is null and revoked",
                Integer.class, share.id())).isOne();
        assertThat(sessionStored()).isFalse();
        assertThat(session.isInvalid()).isTrue();
    }

    void waitForBlockedTransactions(int count) throws InterruptedException {
        var deadline = Instant.now().plus(Duration.ofSeconds(10));
        String waiting = "select count(distinct pid) from pg_locks where not granted";
        while (jdbc.queryForObject(waiting, Integer.class) < count) {
            if (Instant.now().isAfter(deadline)) fail(count + " transaction(s) should be waiting on a lock");
            Thread.sleep(20);
        }
    }

    static void await(CountDownLatch latch) {
        try { latch.await(10, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
