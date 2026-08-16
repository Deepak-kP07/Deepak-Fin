#!/usr/bin/env python3
"""
Deepak Finance Backend API Test Suite
Tests all backend routes with real Supabase credentials
"""
import os
import requests
import json
from datetime import datetime

BASE_URL = os.environ.get('NEXT_PUBLIC_BASE_URL', 'https://fin-dashboard-63.preview.emergentagent.com').rstrip('/')
API = BASE_URL + '/api'

# Real confirmed Supabase user credentials
TEST_EMAIL = 'deepakperumal06@gmail.com'
TEST_PASSWORD = 'deepakfin'

def log_test(num, name, passed, detail):
    """Log test result with number, name, pass/fail status and detail"""
    status = '✅ PASS' if passed else '❌ FAIL'
    print(f"\n{status} - Test #{num}: {name}")
    print(f"  Detail: {detail}")
    return passed

def main():
    print("=" * 80)
    print("DEEPAK FINANCE BACKEND API TEST SUITE")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API URL: {API}")
    print(f"Test User: {TEST_EMAIL}")
    print("=" * 80)
    
    results = []
    test_accounts = []
    test_categories = []
    test_transactions = []
    
    # Anonymous session for guard tests
    anon = requests.Session()
    
    # Authenticated session
    auth = requests.Session()
    
    try:
        # ============================================================
        # ANONYMOUS GUARDS (should return 401)
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 1: ANONYMOUS GUARDS (should return 401)")
        print("=" * 80)
        
        # Test 1: GET /api/auth/me without auth
        r = anon.get(f'{API}/auth/me', timeout=25)
        results.append(log_test(
            1, "GET /api/auth/me (anonymous)",
            r.status_code == 401,
            f"Status: {r.status_code}, Response: {r.text[:200]}"
        ))
        
        # Test 2: GET /api/finance/summary without auth
        r = anon.get(f'{API}/finance/summary', timeout=25)
        results.append(log_test(
            2, "GET /api/finance/summary (anonymous)",
            r.status_code == 401,
            f"Status: {r.status_code}, Response: {r.text[:200]}"
        ))
        
        # Test 3: GET /api/finance/accounts, /categories, /transactions, /budgets without auth
        for endpoint in ['accounts', 'categories', 'transactions', 'budgets']:
            r = anon.get(f'{API}/finance/{endpoint}', timeout=25)
            results.append(log_test(
                3, f"GET /api/finance/{endpoint} (anonymous)",
                r.status_code == 401,
                f"Status: {r.status_code}, Response: {r.text[:200]}"
            ))
        
        # Test 4: POST /api/finance/transactions without auth
        r = anon.post(f'{API}/finance/transactions', 
                     json={'amount': 100, 'type': 'expense', 'description': 'Test'},
                     timeout=25)
        results.append(log_test(
            4, "POST /api/finance/transactions (anonymous)",
            r.status_code == 401,
            f"Status: {r.status_code}, Response: {r.text[:200]}"
        ))
        
        # ============================================================
        # AUTH FLOW
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 2: AUTH FLOW")
        print("=" * 80)
        
        # Test 5: POST /api/auth/login with real credentials
        r = auth.post(f'{API}/auth/login', 
                     json={'email': TEST_EMAIL, 'password': TEST_PASSWORD},
                     timeout=30)
        login_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
        has_cookies = 'df_access_token' in auth.cookies and 'df_refresh_token' in auth.cookies
        has_user = 'user' in login_data and login_data['user'] is not None
        
        results.append(log_test(
            5, "POST /api/auth/login",
            r.status_code == 200 and has_cookies and has_user,
            f"Status: {r.status_code}, Cookies: {list(auth.cookies.keys())}, Has user: {has_user}, Response: {r.text[:300]}"
        ))
        
        if not (r.status_code == 200 and has_cookies):
            print("\n❌ CRITICAL: Login failed, cannot continue with authenticated tests")
            print(f"Response: {r.text}")
            return 1
        
        user_id = login_data.get('user', {}).get('id')
        print(f"\n✓ Logged in successfully as user: {user_id}")
        
        # Test 6: GET /api/auth/me with cookie
        r = auth.get(f'{API}/auth/me', timeout=25)
        me_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
        me_user = me_data.get('user')
        
        results.append(log_test(
            6, "GET /api/auth/me (authenticated)",
            r.status_code == 200 and me_user is not None and me_user.get('id') == user_id,
            f"Status: {r.status_code}, User ID: {me_user.get('id') if me_user else None}, Response: {r.text[:300]}"
        ))
        
        # ============================================================
        # DEFAULT CATEGORIES AUTO-SEED
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 3: DEFAULT CATEGORIES AUTO-SEED")
        print("=" * 80)
        
        # Test 8: GET /api/finance/categories should return >= 11 default categories
        r = auth.get(f'{API}/finance/categories', timeout=30)
        categories_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
        categories_count = len(categories_data) if isinstance(categories_data, list) else 0
        
        # Expected default categories
        expected_defaults = ['Salary', 'Freelance', 'Interest', 'Food & dining', 'Home', 
                           'Transport', 'Investment', 'Shopping', 'Bills & utilities', 
                           'Health', 'Entertainment']
        
        category_names = [c.get('name') for c in categories_data] if isinstance(categories_data, list) else []
        has_defaults = all(name in category_names for name in expected_defaults)
        
        results.append(log_test(
            8, "GET /api/finance/categories (default categories)",
            r.status_code == 200 and categories_count >= 11 and has_defaults,
            f"Status: {r.status_code}, Count: {categories_count}, Has all defaults: {has_defaults}, Categories: {category_names[:15]}"
        ))
        
        # ============================================================
        # ACCOUNTS CRUD
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 4: ACCOUNTS CRUD")
        print("=" * 80)
        
        # Test 9: POST /api/finance/accounts
        account_payload = {
            'name': 'Test Bank',
            'type': 'bank',
            'opening_balance': 10000,
            'color': '#22d3ee'
        }
        r = auth.post(f'{API}/finance/accounts', json=account_payload, timeout=30)
        account_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
        account_id = account_data.get('id') if isinstance(account_data, dict) else None
        account_user_id = account_data.get('user_id') if isinstance(account_data, dict) else None
        
        results.append(log_test(
            9, "POST /api/finance/accounts",
            r.status_code in (200, 201) and account_id is not None and account_user_id == user_id,
            f"Status: {r.status_code}, Account ID: {account_id}, User ID: {account_user_id}, Response: {r.text[:300]}"
        ))
        
        if account_id:
            test_accounts.append(account_id)
        
        # Test 10: GET /api/finance/accounts includes it
        r = auth.get(f'{API}/finance/accounts', timeout=30)
        accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
        account_found = any(a.get('id') == account_id for a in accounts_data) if isinstance(accounts_data, list) else False
        
        results.append(log_test(
            10, "GET /api/finance/accounts (includes created account)",
            r.status_code == 200 and account_found,
            f"Status: {r.status_code}, Account found: {account_found}, Total accounts: {len(accounts_data) if isinstance(accounts_data, list) else 0}"
        ))
        
        # Test 11: PATCH /api/finance/accounts/{id}
        if account_id:
            r = auth.patch(f'{API}/finance/accounts/{account_id}', 
                          json={'name': 'Test Bank 2'}, 
                          timeout=30)
            updated_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
            updated_name = updated_data.get('name') if isinstance(updated_data, dict) else None
            
            results.append(log_test(
                11, "PATCH /api/finance/accounts/{id}",
                r.status_code == 200 and updated_name == 'Test Bank 2',
                f"Status: {r.status_code}, Updated name: {updated_name}, Response: {r.text[:300]}"
            ))
        
        # Test 12: Server should ignore user_id in body (server-controlled)
        forged_payload = {
            'user_id': 'deadbeef-1234-5678-9abc-def012345678',
            'name': 'Forged Account',
            'type': 'cash',
            'opening_balance': 0
        }
        r = auth.post(f'{API}/finance/accounts', json=forged_payload, timeout=30)
        forged_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
        forged_id = forged_data.get('id') if isinstance(forged_data, dict) else None
        forged_user_id = forged_data.get('user_id') if isinstance(forged_data, dict) else None
        
        results.append(log_test(
            12, "POST /api/finance/accounts (server-controlled user_id)",
            r.status_code in (200, 201) and forged_user_id == user_id and forged_user_id != 'deadbeef-1234-5678-9abc-def012345678',
            f"Status: {r.status_code}, User ID: {forged_user_id}, Expected: {user_id}, Response: {r.text[:300]}"
        ))
        
        if forged_id:
            test_accounts.append(forged_id)
        
        # ============================================================
        # TRANSACTIONS (expense, income) - BALANCE VERIFICATION
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 5: TRANSACTIONS WITH BALANCE VERIFICATION")
        print("=" * 80)
        
        # Test 13: Create two test accounts A (opening 10000) and B (opening 5000)
        account_a_payload = {
            'name': 'Test Account A',
            'type': 'bank',
            'opening_balance': 10000,
            'color': '#22d3ee'
        }
        r = auth.post(f'{API}/finance/accounts', json=account_a_payload, timeout=30)
        account_a_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
        account_a_id = account_a_data.get('id') if isinstance(account_a_data, dict) else None
        
        account_b_payload = {
            'name': 'Test Account B',
            'type': 'bank',
            'opening_balance': 5000,
            'color': '#f59e0b'
        }
        r = auth.post(f'{API}/finance/accounts', json=account_b_payload, timeout=30)
        account_b_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
        account_b_id = account_b_data.get('id') if isinstance(account_b_data, dict) else None
        
        results.append(log_test(
            13, "Create test accounts A and B",
            account_a_id is not None and account_b_id is not None,
            f"Account A ID: {account_a_id}, Account B ID: {account_b_id}"
        ))
        
        if account_a_id:
            test_accounts.append(account_a_id)
        if account_b_id:
            test_accounts.append(account_b_id)
        
        # Test 14: POST expense transaction on account A
        if account_a_id:
            expense_payload = {
                'account_id': account_a_id,
                'type': 'expense',
                'amount': 1500,
                'description': 'Coffee',
                'date': datetime.now().strftime('%Y-%m-%d')
            }
            r = auth.post(f'{API}/finance/transactions', json=expense_payload, timeout=30)
            expense_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
            expense_id = None
            if isinstance(expense_data, list) and len(expense_data) > 0:
                expense_id = expense_data[0].get('id')
            elif isinstance(expense_data, dict):
                expense_id = expense_data.get('id')
            
            results.append(log_test(
                14, "POST expense transaction",
                r.status_code in (200, 201) and expense_id is not None,
                f"Status: {r.status_code}, Transaction ID: {expense_id}, Response: {r.text[:300]}"
            ))
            
            if expense_id:
                test_transactions.append(expense_id)
        
        # Test 15: GET /api/finance/accounts - account A balance should be 8500
        if account_a_id:
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            balance_a = account_a.get('current_balance') if account_a else None
            
            results.append(log_test(
                15, "Account A balance after expense (should be 8500)",
                balance_a == 8500,
                f"Status: {r.status_code}, Balance: {balance_a}, Expected: 8500"
            ))
        
        # Test 16: POST income transaction on account A
        if account_a_id:
            income_payload = {
                'account_id': account_a_id,
                'type': 'income',
                'amount': 2000,
                'description': 'Refund',
                'date': datetime.now().strftime('%Y-%m-%d')
            }
            r = auth.post(f'{API}/finance/transactions', json=income_payload, timeout=30)
            income_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
            income_id = None
            if isinstance(income_data, list) and len(income_data) > 0:
                income_id = income_data[0].get('id')
            elif isinstance(income_data, dict):
                income_id = income_data.get('id')
            
            results.append(log_test(
                16, "POST income transaction (A balance should become 10500)",
                r.status_code in (200, 201) and income_id is not None,
                f"Status: {r.status_code}, Transaction ID: {income_id}, Response: {r.text[:300]}"
            ))
            
            if income_id:
                test_transactions.append(income_id)
            
            # Verify balance is now 10500
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            balance_a = account_a.get('current_balance') if account_a else None
            
            print(f"  Balance verification: {balance_a} (expected 10500)")
        
        # ============================================================
        # TRANSFERS (paired rows)
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 6: TRANSFERS (PAIRED ROWS)")
        print("=" * 80)
        
        # Test 17: POST transfer from A to B
        transfer_group_id = None
        transfer_out_id = None
        transfer_in_id = None
        
        if account_a_id and account_b_id:
            transfer_payload = {
                'type': 'transfer',
                'account_id': account_a_id,
                'to_account_id': account_b_id,
                'amount': 1000,
                'description': 'Move to B',
                'date': datetime.now().strftime('%Y-%m-%d')
            }
            r = auth.post(f'{API}/finance/transactions', json=transfer_payload, timeout=30)
            transfer_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else {}
            
            results.append(log_test(
                17, "POST transfer transaction",
                r.status_code in (200, 201),
                f"Status: {r.status_code}, Response: {r.text[:300]}"
            ))
        
        # Test 18: GET /api/finance/transactions - should include TWO rows with same transfer_group_id
        r = auth.get(f'{API}/finance/transactions', timeout=30)
        transactions_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
        
        # Find transfer transactions
        transfer_txns = [t for t in transactions_data if t.get('type') == 'transfer' and t.get('transfer_group_id')] if isinstance(transactions_data, list) else []
        
        if transfer_txns:
            # Get the most recent transfer group
            transfer_group_id = transfer_txns[0].get('transfer_group_id')
            paired_txns = [t for t in transfer_txns if t.get('transfer_group_id') == transfer_group_id]
            
            has_out = any(t.get('transfer_direction') == 'out' and t.get('account_id') == account_a_id for t in paired_txns)
            has_in = any(t.get('transfer_direction') == 'in' and t.get('account_id') == account_b_id for t in paired_txns)
            
            # Store IDs for cleanup
            for t in paired_txns:
                if t.get('transfer_direction') == 'out':
                    transfer_out_id = t.get('id')
                elif t.get('transfer_direction') == 'in':
                    transfer_in_id = t.get('id')
            
            results.append(log_test(
                18, "GET /api/finance/transactions (paired transfer rows)",
                len(paired_txns) == 2 and has_out and has_in,
                f"Status: {r.status_code}, Paired count: {len(paired_txns)}, Has out: {has_out}, Has in: {has_in}, Group ID: {transfer_group_id}"
            ))
        else:
            results.append(log_test(
                18, "GET /api/finance/transactions (paired transfer rows)",
                False,
                f"Status: {r.status_code}, No transfer transactions found"
            ))
        
        # Test 19: GET /api/finance/accounts - A balance decreased by 1000, B balance increased by 1000
        if account_a_id and account_b_id:
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            account_b = next((a for a in accounts_data if a.get('id') == account_b_id), None) if isinstance(accounts_data, list) else None
            balance_a = account_a.get('current_balance') if account_a else None
            balance_b = account_b.get('current_balance') if account_b else None
            
            # A should be 10500 - 1000 = 9500
            # B should be 5000 + 1000 = 6000
            results.append(log_test(
                19, "Account balances after transfer",
                balance_a == 9500 and balance_b == 6000,
                f"Status: {r.status_code}, A balance: {balance_a} (expected 9500), B balance: {balance_b} (expected 6000)"
            ))
        
        # Test 20: DELETE /api/finance/transactions/{outSideId} - both rows removed
        initial_count = len(transactions_data) if isinstance(transactions_data, list) else 0
        
        if transfer_out_id:
            r = auth.delete(f'{API}/finance/transactions/{transfer_out_id}', timeout=30)
            
            results.append(log_test(
                20, "DELETE transfer transaction (both rows removed)",
                r.status_code == 200,
                f"Status: {r.status_code}, Response: {r.text[:300]}"
            ))
            
            # Verify both rows are gone
            r = auth.get(f'{API}/finance/transactions', timeout=30)
            transactions_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            remaining_transfers = [t for t in transactions_data if t.get('transfer_group_id') == transfer_group_id] if isinstance(transactions_data, list) else []
            
            print(f"  Verification: Remaining transfers with group {transfer_group_id}: {len(remaining_transfers)} (expected 0)")
        
        # Test 21: Balances should revert
        if account_a_id and account_b_id:
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            account_b = next((a for a in accounts_data if a.get('id') == account_b_id), None) if isinstance(accounts_data, list) else None
            balance_a = account_a.get('current_balance') if account_a else None
            balance_b = account_b.get('current_balance') if account_b else None
            
            # A should be back to 10500
            # B should be back to 5000
            results.append(log_test(
                21, "Account balances after transfer deletion (reverted)",
                balance_a == 10500 and balance_b == 5000,
                f"Status: {r.status_code}, A balance: {balance_a} (expected 10500), B balance: {balance_b} (expected 5000)"
            ))
        
        # ============================================================
        # TRANSACTION EDIT + DELETE
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 7: TRANSACTION EDIT + DELETE")
        print("=" * 80)
        
        # Test 22: PATCH an expense transaction and verify balance recomputes
        if account_a_id and test_transactions:
            # Get current balance
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            balance_before = account_a.get('current_balance') if account_a else None
            
            # Update the first test transaction (expense of 1500)
            r = auth.patch(f'{API}/finance/transactions/{test_transactions[0]}', 
                          json={'amount': 2000, 'description': 'Updated Coffee'},
                          timeout=30)
            
            # Get new balance
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            balance_after = account_a.get('current_balance') if account_a else None
            
            # Balance should have changed by 500 (from 1500 to 2000 expense)
            # Before: 10500, After: 10000
            results.append(log_test(
                22, "PATCH expense transaction (balance recomputes)",
                r.status_code == 200,
                f"Status: {r.status_code}, Balance before: {balance_before}, Balance after: {balance_after}"
            ))
        
        # Test 23: DELETE an income transaction and verify balance recomputes
        if account_a_id and len(test_transactions) > 1:
            # Get current balance
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            balance_before = account_a.get('current_balance') if account_a else None
            
            # Delete the income transaction (2000)
            r = auth.delete(f'{API}/finance/transactions/{test_transactions[1]}', timeout=30)
            
            # Get new balance
            r = auth.get(f'{API}/finance/accounts', timeout=30)
            accounts_data = r.json() if r.headers.get('content-type', '').startswith('application/json') else []
            account_a = next((a for a in accounts_data if a.get('id') == account_a_id), None) if isinstance(accounts_data, list) else None
            balance_after = account_a.get('current_balance') if account_a else None
            
            # Balance should decrease by 2000
            results.append(log_test(
                23, "DELETE income transaction (balance recomputes)",
                r.status_code == 200,
                f"Status: {r.status_code}, Balance before: {balance_before}, Balance after: {balance_after}"
            ))
        
        # ============================================================
        # LOGOUT
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 8: LOGOUT")
        print("=" * 80)
        
        # Test 7: POST /api/auth/logout
        r = auth.post(f'{API}/auth/logout', timeout=25)
        cookies_cleared = 'df_access_token' not in auth.cookies or auth.cookies.get('df_access_token') == ''
        
        results.append(log_test(
            7, "POST /api/auth/logout",
            r.status_code == 200,
            f"Status: {r.status_code}, Cookies cleared: {cookies_cleared}, Response: {r.text[:200]}"
        ))
        
        # ============================================================
        # CLEANUP
        # ============================================================
        print("\n" + "=" * 80)
        print("SECTION 9: CLEANUP")
        print("=" * 80)
        
        # Re-login for cleanup
        r = auth.post(f'{API}/auth/login', 
                     json={'email': TEST_EMAIL, 'password': TEST_PASSWORD},
                     timeout=30)
        
        if r.status_code == 200:
            print("✓ Re-logged in for cleanup")
            
            # Test 24: Delete test accounts
            cleanup_success = True
            for account_id in test_accounts:
                r = auth.delete(f'{API}/finance/accounts/{account_id}', timeout=30)
                if r.status_code != 200:
                    cleanup_success = False
                    print(f"  ⚠ Failed to delete account {account_id}: {r.status_code}")
                else:
                    print(f"  ✓ Deleted account {account_id}")
            
            # Delete remaining test transactions
            for txn_id in test_transactions:
                r = auth.delete(f'{API}/finance/transactions/{txn_id}', timeout=30)
                if r.status_code != 200:
                    print(f"  ⚠ Failed to delete transaction {txn_id}: {r.status_code}")
                else:
                    print(f"  ✓ Deleted transaction {txn_id}")
            
            results.append(log_test(
                24, "Cleanup test data",
                cleanup_success,
                f"Deleted {len(test_accounts)} accounts and {len(test_transactions)} transactions"
            ))
        else:
            print("❌ Failed to re-login for cleanup")
            results.append(log_test(
                24, "Cleanup test data",
                False,
                "Failed to re-login for cleanup"
            ))
        
        # ============================================================
        # FINAL RESULTS
        # ============================================================
        print("\n" + "=" * 80)
        print("FINAL RESULTS")
        print("=" * 80)
        
        passed = sum(results)
        total = len(results)
        percentage = (passed / total * 100) if total > 0 else 0
        
        print(f"\n{'✅' if passed == total else '❌'} PASSED: {passed}/{total} tests ({percentage:.1f}%)")
        
        if passed == total:
            print("\n🎉 ALL TESTS PASSED!")
            return 0
        else:
            print(f"\n⚠️  {total - passed} test(s) failed")
            return 1
            
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {repr(e)}")
        import traceback
        traceback.print_exc()
        return 2

if __name__ == '__main__':
    exit(main())
