
import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type DynamicCredentialField } from '@/utils/dynamicNodeAnalyzer';

interface CredentialFieldProps {
  field: DynamicCredentialField;
  value: string;
  onChange: (value: string) => void;
  isValid: boolean;
}

export const CredentialField: React.FC<CredentialFieldProps> = ({
  field,
  value,
  onChange,
  isValid
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={field.name} className="text-white flex items-center space-x-2">
        <span>{field.label}</span>
        {field.required && <span className="text-red-400">*</span>}
        {!isValid && value && (
          <AlertCircle className="w-3 h-3 text-red-400" />
        )}
      </Label>
      
      <div className="relative">
        {field.type === 'select' ? (
          <Select
            value={value}
            onValueChange={onChange}
          >
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={field.name}
            type={
              field.type === 'password' && !showPassword 
                ? 'password' 
                : field.type === 'number' 
                ? 'number'
                : field.type === 'email'
                ? 'email'
                : field.type === 'url'
                ? 'url'
                : 'text'
            }
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`bg-white/10 border-white/20 text-white placeholder-white/40 pr-10 ${
              !isValid && value 
                ? 'border-red-400 focus:border-red-400' 
                : ''
            }`}
            required={field.required}
          />
        )}
        
        {field.type === 'password' && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      
      {field.description && (
        <p className="text-xs text-white/50 flex items-start space-x-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{field.description}</span>
        </p>
      )}
      
      {!isValid && value && (
        <p className="text-xs text-red-400 flex items-start space-x-1">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Invalid format for {field.label.toLowerCase()}</span>
        </p>
      )}
    </div>
  );
};
