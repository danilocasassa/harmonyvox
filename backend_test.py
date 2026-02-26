import requests
import sys
import json
from datetime import datetime

class VocalLayersAPITester:
    def __init__(self, base_url="https://vocal-layers-app.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.user_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_song_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        if headers:
            req_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers)
            elif method == 'POST':
                if files:
                    # Remove Content-Type for multipart/form-data
                    req_headers.pop('Content-Type', None)
                    response = requests.post(url, data=data, files=files, headers=req_headers)
                else:
                    response = requests.post(url, json=data, headers=req_headers)
            elif method == 'PUT':
                if files:
                    req_headers.pop('Content-Type', None)
                    response = requests.put(url, data=data, files=files, headers=req_headers)
                else:
                    response = requests.put(url, json=data, headers=req_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json() if response.text else {}
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    # ===== AUTH TESTS =====
    
    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/admin/login",
            200,
            data={"email": "admin@vocallayers.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin token received: {self.admin_token[:20]}...")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Test User {timestamp}",
                "email": f"test.user.{timestamp}@test.com",
                "password": "testpass123"
            }
        )
        if success and 'token' in response:
            self.user_token = response['token']
            if 'user' in response:
                self.test_user_id = response['user']['id']
            print(f"   User token received: {self.user_token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login with registered user"""
        timestamp = datetime.now().strftime('%H%M%S')
        # First register
        reg_success, reg_response = self.run_test(
            "User Registration for Login Test",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Login Test User {timestamp}",
                "email": f"login.test.{timestamp}@test.com",
                "password": "logintest123"
            }
        )
        
        if not reg_success:
            return False
            
        # Then login
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": f"login.test.{timestamp}@test.com",
                "password": "logintest123"
            }
        )
        return success and 'token' in response

    def test_forgot_password(self):
        """Test forgot password endpoint"""
        success, response = self.run_test(
            "Forgot Password",
            "POST",
            "auth/forgot-password",
            200,
            data={"email": "test@example.com"}
        )
        return success and 'message' in response

    # ===== USER PROFILE TESTS =====

    def test_get_user_profile(self):
        """Test getting user profile"""
        if not self.user_token:
            print("❌ No user token available for profile test")
            return False
            
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "users/me",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success and 'id' in response

    def test_update_user_profile(self):
        """Test updating user profile"""
        if not self.user_token:
            print("❌ No user token available for profile update test")
            return False
            
        success, response = self.run_test(
            "Update User Profile",
            "PUT",
            "users/me",
            200,
            data={"name": "Updated Test Name", "whatsapp": "+5511999999999"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success

    def test_change_password(self):
        """Test changing user password"""
        if not self.user_token:
            print("❌ No user token available for password change test")
            return False
            
        success, response = self.run_test(
            "Change Password",
            "PUT",
            "users/me/password",
            200,
            data={"current_password": "testpass123", "new_password": "newtestpass123"},
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success

    # ===== SONGS TESTS =====

    def test_get_songs(self):
        """Test getting songs list"""
        if not self.user_token:
            print("❌ No user token available for songs test")
            return False
            
        success, response = self.run_test(
            "Get Songs List",
            "GET",
            "songs",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success and isinstance(response, list)

    # ===== ADMIN DASHBOARD TESTS =====

    def test_admin_dashboard(self):
        """Test admin dashboard"""
        if not self.admin_token:
            print("❌ No admin token available for dashboard test")
            return False
            
        success, response = self.run_test(
            "Admin Dashboard",
            "GET",
            "admin/dashboard",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and 'total_songs' in response and 'total_users' in response

    # ===== ADMIN USER MANAGEMENT TESTS =====

    def test_admin_get_users(self):
        """Test admin get all users"""
        if not self.admin_token:
            print("❌ No admin token available for users test")
            return False
            
        success, response = self.run_test(
            "Admin Get Users",
            "GET",
            "admin/users",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and isinstance(response, list)

    def test_admin_create_user(self):
        """Test admin create user"""
        if not self.admin_token:
            print("❌ No admin token available for create user test")
            return False
            
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "Admin Create User",
            "POST",
            "admin/users",
            200,
            data={
                "name": f"Admin Created User {timestamp}",
                "email": f"admin.created.{timestamp}@test.com",
                "password": "adminpass123",
                "role": "user"
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success and 'id' in response:
            self.created_user_id = response['id']
            return True
        return False

    def test_admin_update_user(self):
        """Test admin update user"""
        if not self.admin_token or not hasattr(self, 'created_user_id'):
            print("❌ No admin token or created user available for update test")
            return False
            
        success, response = self.run_test(
            "Admin Update User",
            "PUT",
            f"admin/users/{self.created_user_id}",
            200,
            data={"name": "Updated Admin User", "is_active": True},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    # ===== ADMIN SONG MANAGEMENT TESTS =====

    def test_admin_get_songs(self):
        """Test admin get songs"""
        if not self.admin_token:
            print("❌ No admin token available for admin songs test")
            return False
            
        success, response = self.run_test(
            "Admin Get Songs",
            "GET",
            "admin/songs",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and isinstance(response, list)

    def test_admin_create_song(self):
        """Test admin create song"""
        if not self.admin_token:
            print("❌ No admin token available for create song test")
            return False
            
        success, response = self.run_test(
            "Admin Create Song",
            "POST",
            "admin/songs",
            200,
            data={"title": "Test Song API", "artist": "Test Artist API"},
            headers={"Authorization": f"Bearer {self.admin_token}"},
            files={}  # Form data
        )
        if success and 'id' in response:
            self.test_song_id = response['id']
            return True
        return False

    # ===== ADMIN PRICING TESTS =====

    def test_admin_get_pricing(self):
        """Test admin get pricing"""
        if not self.admin_token:
            print("❌ No admin token available for pricing test")
            return False
            
        success, response = self.run_test(
            "Admin Get Pricing",
            "GET",
            "admin/pricing",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and 'current_price' in response

    def test_admin_update_pricing(self):
        """Test admin update pricing"""
        if not self.admin_token:
            print("❌ No admin token available for pricing update test")
            return False
            
        success, response = self.run_test(
            "Admin Update Pricing",
            "PUT",
            "admin/pricing",
            200,
            data={"price": 35.90, "apply_to_all": False},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    # ===== ADMIN WARMUP TESTS =====

    def test_admin_get_warmup(self):
        """Test admin get warmup content"""
        if not self.admin_token:
            print("❌ No admin token available for warmup test")
            return False
            
        success, response = self.run_test(
            "Admin Get Warmup",
            "GET",
            "admin/warmup",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success and isinstance(response, list)

    # ===== PUBLIC ENDPOINTS TESTS =====

    def test_public_pricing(self):
        """Test public pricing endpoint"""
        success, response = self.run_test(
            "Public Pricing",
            "GET",
            "pricing/public",
            200
        )
        return success and 'price' in response

    # ===== UNAUTHORIZED ACCESS TESTS =====

    def test_protected_endpoints_without_auth(self):
        """Test that protected endpoints return 401 without auth"""
        endpoints = [
            ("users/me", "GET"),
            ("songs", "GET"),
            ("admin/dashboard", "GET"),
            ("admin/users", "GET")
        ]
        
        all_passed = True
        for endpoint, method in endpoints:
            success, _ = self.run_test(
                f"Protected {endpoint} without auth",
                method,
                endpoint,
                401
            )
            if not success:
                all_passed = False
        
        return all_passed

def main():
    print("🎵 Starting Vocal Layers API Tests...")
    tester = VocalLayersAPITester()

    # Test sequence
    tests = [
        # Public endpoints
        tester.test_public_pricing,
        
        # Auth tests
        tester.test_admin_login,
        tester.test_user_registration,
        tester.test_user_login,
        tester.test_forgot_password,
        
        # User profile tests (requires user token)
        tester.test_get_user_profile,
        tester.test_update_user_profile,
        tester.test_change_password,
        
        # Songs tests
        tester.test_get_songs,
        
        # Admin dashboard
        tester.test_admin_dashboard,
        
        # Admin user management
        tester.test_admin_get_users,
        tester.test_admin_create_user,
        tester.test_admin_update_user,
        
        # Admin song management
        tester.test_admin_get_songs,
        tester.test_admin_create_song,
        
        # Admin pricing
        tester.test_admin_get_pricing,
        tester.test_admin_update_pricing,
        
        # Admin warmup
        tester.test_admin_get_warmup,
        
        # Protected endpoints without auth
        tester.test_protected_endpoints_without_auth,
    ]

    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")

    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    if success_rate < 80:
        print("⚠️  Less than 80% of tests passed - there are significant backend issues")
        return 1
    elif success_rate < 95:
        print("⚠️  Some tests failed - minor backend issues detected")
        return 0
    else:
        print("✅ All tests passed - backend is working well")
        return 0

if __name__ == "__main__":
    sys.exit(main())