const CATEGORY_TEXT_COLORS = {
  '#E8DFF5': '#7040B0',
  '#DCEBFA': '#2865B0',
  '#FCE4E6': '#B54555',
  '#FFF0D6': '#A65A28',
  '#FFF3CC': '#987018',
  '#DDF3E4': '#267A43',
}

function CategoryTag({ name, color = '#F0F0F0', selected = false, children }) {
  const textColor = CATEGORY_TEXT_COLORS[color] || '#555C60'

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-lg border px-3 py-1 text-sm font-semibold transition ${
        selected ? 'ring-2 ring-[#3E424B] ring-offset-2' : ''
      }`}
      style={{
        backgroundColor: color,
        color: textColor,
        borderColor: textColor,
      }}
    >
      <span className="truncate">{name}</span>
      {children}
    </span>
  )
}

export default CategoryTag
