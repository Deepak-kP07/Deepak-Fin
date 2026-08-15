import os
import requests

BASE_URL = os.environ.get('NEXT_PUBLIC_BASE_URL', 'https://fin-dashboard-63.preview.emergentagent.com').rstrip('/')
API = BASE_URL + '/api'


def check(label, condition, detail):
    print(('PASS' if condition else 'FAIL') + ' - ' + label + ': ' + detail)
    return condition


def main():
    session = requests.Session()
    results = []
    try:
        r = session.get(API + '/auth/me', timeout=20)
        results.append(check('unauthenticated me', r.status_code == 401, f'status={r.status_code} body={r.text[:300]}'))

        r = session.get(API + '/finance/summary', timeout=20)
        results.append(check('unauthenticated summary', r.status_code == 401, f'status={r.status_code} body={r.text[:300]}'))

        r = session.post(API + '/auth/login', json={'email': 'nora.wilson@example.com', 'password': 'DefinitelyNotTheRightPassword!42'}, timeout=20)
        body = r.text.lower()
        results.append(check('login invalid credentials response', r.status_code in (400, 401, 422), f'status={r.status_code} body={r.text[:300]}'))
        results.append(check('login does not leak secrets', 'service_role' not in body and 'supabase_service' not in body and 'access_token' not in body, f'body={r.text[:300]}'))

        r = session.post(API + '/auth/signup', json={'email': 'deepak.finance.validation@example.com', 'password': 'NotARealPassword!42', 'name': 'Deepak Finance Validation'}, timeout=20)
        results.append(check('signup forwards and returns response', r.status_code in (200, 201, 400, 422), f'status={r.status_code} body={r.text[:300]}'))
        body = r.text.lower()
        results.append(check('signup does not leak secrets', 'service_role' not in body and 'supabase_service' not in body, f'body={r.text[:300]}'))

        r = session.post(API + '/auth/logout', timeout=20)
        cookies = r.headers.get('set-cookie', '').lower()
        results.append(check('logout succeeds and clears cookies', r.status_code == 200 and ('df_access_token' in cookies or 'df_refresh_token' in cookies), f'status={r.status_code} set-cookie={r.headers.get("set-cookie", "")[:500]}'))
        results.append(check('logout clears both auth cookies', 'df_access_token' in cookies and 'df_refresh_token' in cookies, f'set-cookie={r.headers.get("set-cookie", "")[:500]}'))

        print(f'RESULT {sum(results)}/{len(results)} checks passed')
        return 0 if all(results) else 1
    except Exception as exc:
        print('ERROR - request test exception:', repr(exc))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
