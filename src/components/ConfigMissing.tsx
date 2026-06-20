import { Layout } from './Layout';

export function ConfigMissing() {
  return (
    <Layout>
      <div className="config-missing">
        <h1>환경 설정이 필요합니다</h1>
        <p>
          Supabase 연결 정보가 없어 앱을 실행할 수 없습니다.
          Vercel에 배포한 경우 아래 환경 변수를 추가한 뒤 <strong>Redeploy</strong> 해 주세요.
        </p>
        <ul>
          <li><code>VITE_SUPABASE_URL</code></li>
          <li><code>VITE_SUPABASE_ANON_KEY</code></li>
        </ul>
        <p className="hint">
          Vercel → Project → Settings → Environment Variables에서 Production·Preview·Development 모두에
          추가한 후, Deployments 탭에서 최신 배포를 「Redeploy」하세요.
        </p>
      </div>
    </Layout>
  );
}
