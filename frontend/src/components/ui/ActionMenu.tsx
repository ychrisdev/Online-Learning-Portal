import React from "react";
import ReactDOM from "react-dom";

interface ActionMenuItem {
  label: string;
  onClick: () => void;
  variant?: string;
  hidden?: boolean;
}

const CLOSE_ALL_EVENT = "actionmenu:closeall";

const ActionMenu: React.FC<{ items: ActionMenuItem[] }> = ({ items }) => {
  const [open, setOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });
  const idRef = React.useRef(Math.random());
  const ref = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.except !== idRef.current) {
        setOpen(false);
      }
    };
    document.addEventListener(CLOSE_ALL_EVENT, handler);
    return () => document.removeEventListener(CLOSE_ALL_EVENT, handler);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current && !ref.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (open) {
      setOpen(false);
      return;
    }

    document.dispatchEvent(
      new CustomEvent(CLOSE_ALL_EVENT, { detail: { except: idRef.current } })
    );

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 140;
      let left = rect.right - menuWidth;
      if (left < 8) left = rect.left;
      setMenuPos({ top: rect.bottom + 6, left });
    }

    setOpen(true);
  };

  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;

  return (
    <div className="am-wrap" ref={ref}>
      <button className="am-trigger" ref={triggerRef} onClick={handleOpen}>
        •••
      </button>
      {open &&
        ReactDOM.createPortal(
          <div
            ref={menuRef}
            className="am-menu"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
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