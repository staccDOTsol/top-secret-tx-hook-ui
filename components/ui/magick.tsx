import React from 'react'
import { ArrowRightLeft } from 'lucide-react'

interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

const Magick: React.FC<ButtonProps> = ({ onClick, disabled = false, loading = false }) => {
  return (
    <button
      className={`
        relative overflow-hidden px-6 py-3 bg-gradient-to-r from-pink-500 to-yellow-500
        rounded-full text-white font-semibold text-lg shadow-md
        transition-all duration-300 ease-in-out
        hover:shadow-lg hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <span className="relative z-10 flex items-center justify-center">
        {loading ? (
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <ArrowRightLeft className="mr-2 h-5 w-5" />
        )}
        Perform Arbitrage
      </span>
    </button>
  )
}

export default Magick