import CategoryTag from './CategoryTag'

function SavedPlacesCard({ label, address, category, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col justify-center rounded-[18px] border-2 border-[#3E424B]/80 bg-[#DCE7D2] px-5 py-4 sm:min-h-[175px] sm:px-7 sm:py-6 text-left transition hover:-translate-y-1"
    >

      {category && (
        <div className="mb-3">
          <CategoryTag
            name={category.name}
            color={category.color}
          />
        </div>
      )}

      <h3
        className="mt-2 text-[24px] text-[#2A3439]"
        style={{ fontFamily: '"DM Serif Display", serif' }}
      >
        {label}
      </h3>

      <p className="mt-1.5 text-sm text-[#555C60]">
        {address}
      </p>

    </button>
  )
}

export default SavedPlacesCard