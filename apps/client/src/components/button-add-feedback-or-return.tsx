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
import React from "react";
import { useTranslation } from "react-i18next";
import { Button, ButtonGroup } from "@heroui/button";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";

import { ChevronDownIcon } from "./icons";

/**
 * ButtonAddFeedbackOrReturn is a component that displays a button with a dropdown
 * menu. The button shows the label of the currently selected option, and the
 * dropdown menu allows the user to select between two options: "feedback" and
 * "return". The component uses a Set to manage the selected option.
 *
 * @param {Object} props - Component props
 * @param {Function} props.onAction - Function called when the main button is clicked, receives selected key
 * @returns {JSX.Element} The rendered component.
 */
export default function ButtonAddFeedbackOrReturn({
  onAction,
}: {
  onAction?: (selectedKey: string) => void;
}) {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = React.useState(
    new Set(["feedback"]),
  );

  const descriptionsMap: { [key: string]: string } = {
    feedback: t('add-a-feedback-to-this-purchase'),
    return: t('cancel-this-purchase-and-return-the-item'),
  };

  const labelsMap: { [key: string]: string } = {
    feedback: t("create-feedback"),
    return: t('return-this-item'),
  };

  // Convert the Set to an Array and get the first value.
  const selectedOptionValue = Array.from(selectedOption)[0];

  // Handle the button click - call the onAction callback with the selected key
  const handleButtonClick = () => {
    if (onAction) {
      onAction(selectedOptionValue);
    }
  };

  // Handle selection change from dropdown
  const handleSelectionChange = (keys: any) => {
    setSelectedOption(new Set([keys.currentKey]));
  };

  return (
    <ButtonGroup>
      <Button color="primary" onPress={handleButtonClick} className="rounded-lg rounded-r-none rtl:rounded-lg rtl:rounded-l-none">
        {labelsMap[selectedOptionValue]}
      </Button>
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <Button isIconOnly color="primary" variant="flat" className="rounded-lg rounded-l-none rtl:rounded-lg rtl:rounded-r-none">
            <ChevronDownIcon />
          </Button>
        </DropdownTrigger>
        <DropdownMenu
          disallowEmptySelection
          aria-label="Action options"
          className="max-w-[300px]"
          selectedKeys={selectedOption}
          selectionMode="single"
          onSelectionChange={handleSelectionChange}
        >
          <DropdownItem
            key="feedback"
            description={descriptionsMap["feedback"]}
          >
            {labelsMap["feedback"]}
          </DropdownItem>
          <DropdownItem key="return" description={descriptionsMap["return"]}>
            {labelsMap["return"]}
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </ButtonGroup>
  );
}
