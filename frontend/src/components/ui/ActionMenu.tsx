import React from "react";
import ReactDOM from "react-dom";

interface ActionMenuItem {
  label: string;
  onClick: () => void;
  variant?: string;
  hidden?: boolean;
}

const ActionMenu: React.FC<{ items: ActionMenuItem[] }> = ({ items }) => {
  const [open, setOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });
  const ref = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, left: rect.right - 130 });
    }
    setOpen((v) => !v);
  };

  const visible = items.filter((i) => !i.hidden);

  return (
    <div className="am-wrap" ref={ref}>
      <button
        className="am-trigger"
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); handleOpen(); }}
      >
        •••
      </button>
      {open && ReactDOM.createPortal(
        <div ref={menuRef} className="am-menu" style={{ top: menuPos.top, left: menuPos.left }}>
          {visible.map((item, i) => (
            <button
              key={i}
              className={`am-item am-item--${item.variant ?? "default"}`}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ActionMenu;