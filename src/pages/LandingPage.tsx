import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';

export function LandingPage() {
  return (
    <Layout>
      <div className="landing">
        <div className="landing__hero">
          <h1 className="landing__title">친구에게 칭찬 한 장,<br />마음 한 장</h1>
          <p className="landing__subtitle">
            학급 칭찬 롤링페이퍼로 서로의 장점을 발견하고 전해 보세요.
          </p>
        </div>
        <div className="landing__actions">
          <Link to="/create" className="btn btn-primary btn-lg">
            학급 만들기 (선생님)
          </Link>
          <Link to="/join" className="btn btn-secondary btn-lg">
            참여하기 (학생)
          </Link>
        </div>
      </div>
    </Layout>
  );
}
