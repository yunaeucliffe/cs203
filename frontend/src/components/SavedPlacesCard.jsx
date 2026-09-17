function SavedPlacesCard({ label, name, address }) {
    return (
        <button className="group flex min-h-[175px] flex-col justify-center rounded-[18px] border-2 border-[#3E424B]/80 bg-[#DCE7D2] px-7 py-6 text-left transition hover:-translate-y-1">

            <span className="text-[11px] font-extrabold tracking-[0.14em] text-[#7A7F7A]">
                {label}
            </span>

            <h3
                className="mt-2 text-[24px] text-[#2A3439]"
                style={{
                    fontFamily: '"DM Serif Display", serif',
                }}
            >
                {name}
            </h3>

            <p className="mt-1.5 text-[15px] text-[#7A7F7A]">
                {address}
            </p>

        </button>
    )
}

export default SavedPlacesCard