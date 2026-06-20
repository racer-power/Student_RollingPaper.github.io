import { CARD_COLORS } from '../lib/constants';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker">
      <span className="color-picker__label">색상</span>
      <div className="color-picker__options">
        {CARD_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`color-picker__swatch ${value === color ? 'color-picker__swatch--active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            aria-label={`색상 ${color}`}
          />
        ))}
      </div>
    </div>
  );
}
