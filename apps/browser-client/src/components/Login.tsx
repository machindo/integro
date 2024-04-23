import useSWRMutation from 'swr/mutation';
import { api } from '../api';

export const Login = () => {
  const { trigger: login } = useSWRMutation('api.auth.login', () => api.auth.login('0', '0'));
  const { trigger: logout } = useSWRMutation('api.auth.logout', () => api.auth.logout());

  return (<>
    <button type="button" onClick={() => login()}>Login</button>
    <button type="button" onClick={() => logout()}>Logout</button>
  </>);
}