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
import type { VariantProps } from "tailwind-variants";

import { tv } from "tailwind-variants";
import { dataFocusVisibleClasses } from "@heroui/theme";

/**
 * Card **Tailwind Variants** component
 *
 * @example
 * ```js
 * const {base, topbar, items, item, buttons} = fileUpload({...})
 *
 * <div className={base()}>
 *     <div className={topbar()}>Topbar</div>
 *     <div className={items()}>
 *         <div className={item()}>
 *             Item
 *         </div>
 *     </div>
 *    <div className={buttons()}>Buttons</div>
 * </div>
 * ```
 */
const fileUpload = tv({
  slots: {
    base: [
      "flex",
      "flex-col",
      "relative",
      "overflow-hidden",
      "h-auto",
      "outline-none",
      "text-foreground",
      "box-border",
      "bg-content1",
      ...dataFocusVisibleClasses,
    ],
    topbar: ["flex", "gap-3"],
    items: [
      "relative",
      "p-3",
      "break-words",
      "text-start",
      "overflow-y-auto",
      "subpixel-antialiased",
    ],
    item: ["flex", "gap-2", "my-2"],
    buttons: [
      "flex",
      "gap-3",
      "p-3",
      "w-full",
      "items-center",
      "overflow-hidden",
      "color-inherit",
      "subpixel-antialiased",
    ],
  },
  variants: {
    isDisabled: {
      true: {
        base: "opacity-disabled cursor-not-allowed",
      },
    },
  },
  compoundVariants: [],
  defaultVariants: {
    isDisabled: false,
  },
});

export type FileUploadVariantProps = VariantProps<typeof fileUpload>;
export type FileUploadSlots = keyof ReturnType<typeof fileUpload>;
export type FileUploadReturnType = ReturnType<typeof fileUpload>;

export { fileUpload };
