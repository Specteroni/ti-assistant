import { CSSProperties, PropsWithChildren, ReactNode, useState } from "react";
import styles from "./SelectableRow.module.scss";
import { rem } from "./util/util";

interface SelectableRowProps<Type extends string> {
  itemId: Type;
  selectItem?: (itemId: Type) => void;
  removeItem?: (itemId: Type) => void;
  confirmRemove?: boolean;
  removeLabel?: ReactNode;
  style?: CSSProperties;
  viewOnly?: boolean;
}

export function SelectableRow<Type extends string>({
  children,
  itemId,
  confirmRemove,
  removeLabel,
  selectItem,
  removeItem,
  style,
  viewOnly,
}: PropsWithChildren<SelectableRowProps<Type>>) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const iconStyle: CSSProperties = {
    textShadow: "none",
  };
  if (style && style.fontSize) {
    const fontSizeValue = style.fontSize.valueOf();
    if (typeof fontSizeValue === "string") {
      style.fontSize.valueOf();
      const baseSize = parseInt(fontSizeValue.replace("px", ""));
      const size = parseInt(fontSizeValue.replace("px", ""));
      if (baseSize !== 0) {
        iconStyle.fontSize = rem(size);
        iconStyle.width = rem(size);
        iconStyle.height = rem(size);
        iconStyle.lineHeight = rem(size);
        iconStyle.marginRight = rem(3);
        iconStyle.marginLeft = 0;
        style = {
          ...style,
          fontSize: rem(baseSize),
        };
      }
    }
  }

  const removeButton = !viewOnly && removeItem ? (
    <button
      className={
        removeLabel
          ? `${styles.LabeledRemoveButton} clickable negative`
          : "clickable negative iconButton"
      }
      style={
        removeLabel
          ? undefined
          : {
              ...iconStyle,
              width:
                confirmingRemove || removeLabel ? undefined : iconStyle.width,
              paddingInline:
                confirmingRemove || removeLabel ? rem(4) : undefined,
            }
      }
      onClick={() => {
        if (confirmRemove && !confirmingRemove) {
          setConfirmingRemove(true);
          return;
        }
        removeItem(itemId);
        setConfirmingRemove(false);
      }}
      onBlur={() => setConfirmingRemove(false)}
      title={confirmingRemove ? "Click again to remove" : "Remove"}
    >
      {confirmingRemove ? "Confirm" : (removeLabel ?? <>&#x2715;</>)}
    </button>
  ) : null;

  return (
    <div
      className={`${styles.SelectableRow} ${
        removeLabel ? styles.withLabeledRemove : ""
      }`}
      style={style}
    >
      {!viewOnly && selectItem ? (
        <button
          className="icon clickable positive iconButton"
          style={iconStyle}
          onClick={() => selectItem(itemId)}
        >
          +
        </button>
      ) : null}
      {!removeLabel ? removeButton : null}
      {children}
      {removeLabel ? removeButton : null}
    </div>
  );
}
