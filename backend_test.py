#!/usr/bin/env python3
"""
ALLO PIECES 76 - Backend API Testing Suite
Tests all endpoints including auth, products, payments, and pro access
"""

import requests
import sys
import json
from datetime import datetime

class AlloPieces76APITester:
    def __init__(self, base_url="https://allo-pieces.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append({"test": test_name, "details": details})
            print(f"❌ {test_name} - FAILED: {details}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_result(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                details = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    details += f" - {error_detail}"
                except:
                    details += f" - {response.text[:200]}"
                self.log_result(name, False, details)
                return False, {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_categories(self):
        """Test categories endpoint"""
        return self.run_test("Get Categories", "GET", "categories", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@allopieces76.fr", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_admin_me(self):
        """Test admin me endpoint"""
        if not self.token:
            self.log_result("Admin Me (No Token)", False, "No token available")
            return False
        return self.run_test("Admin Me", "GET", "auth/me", 200)

    def test_get_products(self):
        """Test get all products"""
        return self.run_test("Get All Products", "GET", "products", 200)

    def test_search_products(self):
        """Test product search"""
        return self.run_test("Search Products", "GET", "products?search=clio", 200)

    def test_filter_products_by_category(self):
        """Test product filtering by category"""
        return self.run_test("Filter by Category", "GET", "products?category=carrosserie", 200)

    def test_create_product(self):
        """Test creating a new product"""
        if not self.token:
            self.log_result("Create Product (No Token)", False, "No token available")
            return False, None
            
        test_product = {
            "reference": f"TEST-{datetime.now().strftime('%H%M%S')}",
            "name": "Test Product for API Testing",
            "price": 99.99,
            "stock": "En stock",
            "category": "carrosserie",
            "vehicle": "Test Vehicle"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=test_product
        )
        
        if success and 'id' in response:
            return True, response['id']
        return False, None

    def test_update_product(self, product_id):
        """Test updating a product"""
        if not self.token or not product_id:
            self.log_result("Update Product", False, "No token or product ID")
            return False
            
        update_data = {
            "name": "Updated Test Product",
            "price": 149.99
        }
        
        return self.run_test(
            "Update Product",
            "PUT",
            f"products/{product_id}",
            200,
            data=update_data
        )

    def test_get_single_product(self, product_id):
        """Test getting a single product"""
        if not product_id:
            self.log_result("Get Single Product", False, "No product ID")
            return False
            
        return self.run_test(
            "Get Single Product",
            "GET",
            f"products/{product_id}",
            200
        )

    def test_delete_product(self, product_id):
        """Test deleting a product"""
        if not self.token or not product_id:
            self.log_result("Delete Product", False, "No token or product ID")
            return False
            
        return self.run_test(
            "Delete Product",
            "DELETE",
            f"products/{product_id}",
            200
        )

    def test_pro_code_validation_valid(self):
        """Test pro code validation with correct code"""
        return self.run_test(
            "Pro Code Valid",
            "POST",
            "pro/validate",
            200,
            data={"code": "jossanpb09"}
        )

    def test_pro_code_validation_invalid(self):
        """Test pro code validation with incorrect code"""
        success, response = self.run_test(
            "Pro Code Invalid",
            "POST",
            "pro/validate",
            200,
            data={"code": "wrongcode"}
        )
        
        # Check if response indicates invalid code
        if success and response.get('valid') == False:
            self.log_result("Pro Code Invalid Response", True)
            return True
        else:
            self.log_result("Pro Code Invalid Response", False, "Should return valid=False")
            return False

    def test_payment_checkout(self):
        """Test payment checkout creation"""
        payment_data = {
            "amount": 50.00,
            "description": "Test payment",
            "origin_url": "https://allo-pieces.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Create Payment Checkout",
            "POST",
            "payments/checkout",
            200,
            data=payment_data
        )
        
        if success and 'url' in response and 'session_id' in response:
            return True, response['session_id']
        return False, None

    def test_payment_status(self, session_id):
        """Test payment status check"""
        if not session_id:
            self.log_result("Payment Status", False, "No session ID")
            return False
            
        return self.run_test(
            "Get Payment Status",
            "GET",
            f"payments/status/{session_id}",
            200
        )

    def test_create_quote(self):
        """Test creating a new quote request"""
        quote_data = {
            "name": "Test Client",
            "email": "test@example.com",
            "phone": "0123456789",
            "plate_or_vin": "AB-123-CD",
            "part_description": "Pare-choc avant pour test"
        }
        
        success, response = self.run_test(
            "Create Quote Request",
            "POST",
            "quotes",
            200,
            data=quote_data
        )
        
        if success and 'quote_id' in response:
            return True, response['quote_id']
        return False, None

    def test_get_quotes_unauthorized(self):
        """Test getting quotes without authentication"""
        old_token = self.token
        self.token = None
        result = self.run_test("Get Quotes (Unauthorized)", "GET", "quotes", 401)
        self.token = old_token
        return result

    def test_get_quotes_authorized(self):
        """Test getting quotes with authentication"""
        if not self.token:
            self.log_result("Get Quotes (No Token)", False, "No token available")
            return False
        return self.run_test("Get Quotes (Authorized)", "GET", "quotes", 200)

    def test_get_quote_stats(self):
        """Test getting quote statistics"""
        if not self.token:
            self.log_result("Get Quote Stats (No Token)", False, "No token available")
            return False
        return self.run_test("Get Quote Statistics", "GET", "quotes/stats/summary", 200)

    def test_get_single_quote(self, quote_id):
        """Test getting a single quote"""
        if not self.token or not quote_id:
            self.log_result("Get Single Quote", False, "No token or quote ID")
            return False
            
        return self.run_test(
            "Get Single Quote",
            "GET",
            f"quotes/{quote_id}",
            200
        )

    def test_update_quote_status(self, quote_id):
        """Test updating quote status"""
        if not self.token or not quote_id:
            self.log_result("Update Quote Status", False, "No token or quote ID")
            return False
            
        update_data = {
            "status": "processed",
            "admin_notes": "Test note from API testing"
        }
        
        return self.run_test(
            "Update Quote Status",
            "PUT",
            f"quotes/{quote_id}",
            200,
            data=update_data
        )

    def test_delete_quote(self, quote_id):
        """Test deleting a quote"""
        if not self.token or not quote_id:
            self.log_result("Delete Quote", False, "No token or quote ID")
            return False
            
        return self.run_test(
            "Delete Quote",
            "DELETE",
            f"quotes/{quote_id}",
            200
        )

    def test_invalid_endpoints(self):
        """Test some invalid endpoints to ensure proper error handling"""
        # Test non-existent product
        self.run_test("Get Non-existent Product", "GET", "products/nonexistent", 404)
        
        # Test non-existent quote
        if self.token:
            self.run_test("Get Non-existent Quote", "GET", "quotes/nonexistent", 404)
        
        # Test unauthorized product creation
        old_token = self.token
        self.token = None
        self.run_test("Unauthorized Product Creation", "POST", "products", 401, 
                     data={"reference": "TEST", "name": "Test", "price": 10})
        self.token = old_token

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("🚀 ALLO PIECES 76 - API Testing Suite")
        print("=" * 60)
        
        # Basic API tests
        self.test_root_endpoint()
        self.test_categories()
        
        # Authentication tests
        if self.test_admin_login():
            self.test_admin_me()
        
        # Product tests
        self.test_get_products()
        self.test_search_products()
        self.test_filter_products_by_category()
        
        # CRUD operations (if authenticated)
        product_id = None
        if self.token:
            success, product_id = self.test_create_product()
            if success and product_id:
                self.test_get_single_product(product_id)
                self.test_update_product(product_id)
                self.test_delete_product(product_id)
        
        # Pro access tests
        self.test_pro_code_validation_valid()
        self.test_pro_code_validation_invalid()
        
        # Payment tests
        success, session_id = self.test_payment_checkout()
        if success and session_id:
            self.test_payment_status(session_id)
        
        # Quote system tests
        quote_id = None
        success, quote_id = self.test_create_quote()
        self.test_get_quotes_unauthorized()
        if self.token:
            self.test_get_quotes_authorized()
            self.test_get_quote_stats()
            if quote_id:
                self.test_get_single_quote(quote_id)
                self.test_update_quote_status(quote_id)
                self.test_delete_quote(quote_id)
        
        # Error handling tests
        self.test_invalid_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"   • {failure['test']}: {failure['details']}")
        
        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = AlloPieces76APITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())