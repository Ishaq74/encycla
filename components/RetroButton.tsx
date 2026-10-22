import React from 'react';

interface RetroButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'normal' | 'active' | 'disabled';
}

export const RetroButton: React.FC<RetroButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'normal',
  ...props 
}) => {
  
  const baseStyles = "relative px-4 py-1 text-sm md:text-base font-bold select-none active:border-t-2 active:border-l-2 active:border-b-0 active:border-r-0 outline-none";
  
  // Windows 95 Button Look:
  // Normal: Light gray bg, White top/left border, Dark gray right/bottom border, Black outer right/bottom.
  // Active (Pressed): Dark gray top/left, White bottom/right.
  
  const normalStyles = "bg-[#c0c0c0] text-black border-t-2 border-l-2 border-r-2 border-b-2 border-t-white border-l-white border-r-gray-800 border-b-gray-800 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:border-t-gray-800 active:border-l-gray-800 active:border-r-white active:border-b-white";
  
  const disabledStyles = "bg-[#c0c0c0] text-gray-500 border-t-2 border-l-2 border-r-2 border-b-2 border-t-white border-l-white border-r-gray-500 border-b-gray-500 cursor-not-allowed";

  const appliedStyle = props.disabled ? disabledStyles : normalStyles;

  return (
    <button 
      className={`${baseStyles} ${appliedStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};