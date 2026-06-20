import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  backTo?: string;
}

export function Layout({ children, title, backTo }: LayoutProps) {
  return (
    <div className="layout">
      <header className="header">
        {backTo ? (
          <Link to={backTo} className="back-link">
            ← 돌아가기
          </Link>
        ) : (
          <Link to="/" className="logo">
            칭찬 롤링페이퍼
          </Link>
        )}
        {title && <h1 className="page-title">{title}</h1>}
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
