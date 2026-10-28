import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './PasswordInput.css';

const PasswordInput = ({ inputClassName = '', className = '', style, ...inputProps }) => {
  const [isVisible, setIsVisible] = useState(false);
  const wrapperClassName = ['password-field', className].filter(Boolean).join(' ');
  const inputClasses = ['password-field__input', inputClassName].filter(Boolean).join(' ');

  return (
    <div className={wrapperClassName}>
      <input
        {...inputProps}
        className={inputClasses}
        style={style}
        type={isVisible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="password-field__toggle"
        aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={isVisible}
        disabled={inputProps.disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
