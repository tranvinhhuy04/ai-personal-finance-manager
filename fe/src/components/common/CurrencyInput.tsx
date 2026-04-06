import React from 'react';
import { NumericFormat, type NumericFormatProps } from 'react-number-format';
import { cn } from '@/lib/utils';

type CurrencyInputProps = Omit<NumericFormatProps, 'onValueChange'> & {
  onValueChange?: (value: string) => void;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  className,
  onValueChange,
  ...props
}) => {
  return (
    <NumericFormat
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={0}
      allowNegative={false}
      suffix=" đ"
      inputMode="numeric"
      className={cn(
        'w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-emerald-500',
        className,
      )}
      onValueChange={(values) => onValueChange?.(values.value)}
      {...props}
    />
  );
};

export default CurrencyInput;
