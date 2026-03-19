export default function AdminLayout({ children, onScroll }) {
  return (
    <div className="w-full" onScroll={onScroll}>
      {children}
    </div>
  );
}
