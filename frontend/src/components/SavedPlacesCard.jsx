function SavedPlacesCard({ label, address, onClick }) {
    return (
        <button onClick={onClick} className="group flex min-h-[175px] flex-col justify-center rounded-[18px] border-2 border-[#3E424B]/80 bg-[#DCE7D2] px-7 py-6 text-left transition hover:-translate-y-1">

            <h3
                className="mt-2 text-[24px] text-[#2A3439]"
                style={{
                    fontFamily: '"DM Serif Display", serif',
                }}
            >
                {label}
            </h3>

            <p className="mt-1.5 text-[15px] text-[#7A7F7A]">
                {address}
            </p>

        </button>
    )
}

export default SavedPlacesCard
