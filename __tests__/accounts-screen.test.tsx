import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AccountsScreen from '../app/(app)/profile/accounts';
import * as accountsApi from '../lib/api/accounts';

// Trivial smoke test: confirms the accounts screen renders and wires up
// TanStack Query correctly against a mocked API module. Full screen coverage
// (form validation, mutations, delete-guard messaging, ...) is out of scope
// for this smoke-test suite.
jest.mock('../lib/api/accounts', () => {
  const actual = jest.requireActual('../lib/api/accounts');
  return {
    ...actual,
    listAccounts: jest.fn(),
  };
});

describe('AccountsScreen', () => {
  it('renders the account list returned by the API', async () => {
    (accountsApi.listAccounts as jest.Mock).mockResolvedValue([
      {
        id: 'acc-1',
        name: 'Main Checking',
        type: 'AT02',
        typeLabel: 'Banco',
        isActive: true,
        balanceCents: 123456,
        createdAt: '2026-07-09T00:00:00.000Z',
      },
    ]);

    const queryClient = new QueryClient();

    // @testing-library/react-native v14's `render` is async (it wraps the
    // initial render in `act()`), so it must be awaited before querying.
    await render(
      <QueryClientProvider client={queryClient}>
        <AccountsScreen />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Accounts')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Main Checking')).toBeTruthy());
    expect(screen.getByText('$1,234.56')).toBeTruthy();
  });
});
