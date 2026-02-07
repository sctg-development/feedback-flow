/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { ReactNode } from "react";
import { clsx } from "@heroui/shared-utils";

export interface PanelProps {
  /**
   * Panel title
   */
  title: string;

  /**
   * Optional panel description
   */
  description?: string;

  /**
   * Main panel content
   */
  children: ReactNode;

  /**
   * Additional CSS classes for the container
   */
  className?: string;

  /**
   * CSS classes for the title
   */
  titleClassName?: string;

  /**
   * CSS classes for the description
   */
  descriptionClassName?: string;

  /**
   * CSS classes for the content container
   */
  contentClassName?: string;
}

/**
 * Panel component to display framed content with a title and description
 */
export default function Panel({
  title,
  description,
  children,
  className,
  titleClassName,
  descriptionClassName,
  contentClassName,
}: PanelProps) {
  return (
    <div className={clsx("border rounded-xl p-6 shadow-sm", className)}>
      <h2 className={clsx("text-xl font-semibold mb-2", titleClassName)}>
        {title}
      </h2>

      {description && (
        <p className={clsx("text-muted-foreground mb-4", descriptionClassName)}>
          {description}
        </p>
      )}

      <div className={contentClassName}>{children}</div>
    </div>
  );
}
