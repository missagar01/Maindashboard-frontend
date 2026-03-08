import { ReactNode } from "react";

interface LabelProps {
  children: ReactNode;
  htmlFor?: string;
}

export default function Label({ children, htmlFor }: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {children}
    </label>
  );
}





