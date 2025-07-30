function Button({ 
  children, 
  type = "button", 
  onClick, 
  className = "",
  variant = "primary",
  disabled = false
}) {
  const baseClasses = "font-semibold py-3 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
  
  const variants = {
    primary: "bg-[#00AABB] hover:bg-[#82d0d7] text-white shadow-lg focus:ring-[#00AABB]",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 shadow-sm focus:ring-gray-500",
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${className}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button