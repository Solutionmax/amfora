"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconEdit, IconX } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditableFieldProps {
  label: string;
  value: any;
  onSave: (value: any) => void;
  type?: "text" | "select" | "datetime-local" | "number";
  placeholder?: string;
  options?: { value: string; label: string }[];
  disabled?: boolean;
  renderValue?: (value: any) => React.ReactNode;
  checkboxLabel?: string;
  checkboxCondition?: (value: any) => boolean;
  onCheckboxChange?: (checked: boolean, setValue: (value: any) => void) => void;
  customEditor?: (props: {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  }) => React.ReactNode;
}

export function EditableField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
  options,
  disabled = false,
  renderValue,
  checkboxLabel,
  checkboxCondition,
  onCheckboxChange,
  customEditor,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    setIsEditing(true);

    if (checkboxCondition) {
      const isChecked = checkboxCondition(value);
      setCheckboxChecked(isChecked);
    }

    if (type === "datetime-local" && value) {
      setEditValue(new Date(value).toISOString().slice(0, 16));
    } else {
      setEditValue(value?.toString() || "");
    }
  };

  const handleSave = async () => {
    let processedValue: any = editValue;

    if (type === "number") {
      processedValue = editValue ? parseInt(editValue) : null;
    } else if (type === "datetime-local") {
      processedValue = editValue ? new Date(editValue).toISOString() : null;
    }

    await onSave(processedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setCheckboxChecked(checked);
    if (onCheckboxChange) {
      onCheckboxChange(checked, setEditValue);
    }
  };

  const displayValue = renderValue ? renderValue(value) : value?.toString() || placeholder || "";

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        {!disabled && !isEditing && (
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={startEdit}
          >
            <IconEdit className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          {checkboxLabel && (
            <div className="flex items-center gap-2">
              <Checkbox checked={checkboxChecked} onCheckedChange={handleCheckboxChange} />
              <label className="text-xs text-muted-foreground cursor-pointer">{checkboxLabel}</label>
            </div>
          )}

          {(!checkboxLabel || !checkboxChecked) && (
            <>
              {customEditor ? (
                customEditor({
                  value: editValue,
                  onChange: setEditValue,
                  onKeyDown: handleKeyDown,
                })
              ) : type === "select" ? (
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger className="h-8 flex-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  ref={inputRef}
                  type={type}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 flex-1 text-sm"
                  placeholder={placeholder}
                  min={type === "number" ? "1" : undefined}
                />
              )}
            </>
          )}

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-green-600 hover:text-green-700"
              onClick={handleSave}
            >
              <IconCheck className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-red-600 hover:text-red-700"
              onClick={handleCancel}
            >
              <IconX className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm">{displayValue}</div>
      )}
    </div>
  );
}
