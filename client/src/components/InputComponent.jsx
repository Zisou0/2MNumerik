function Input({ 
  label, 
  type = "text", 
  id, 
  value, 
  onChange, 
  placeholder, 
  className = "",
  required = false,
  min,
  max
}) {
  return (
    <div className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500"
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
      />
    </div>
  )
}

export default Input