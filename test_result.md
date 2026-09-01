#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
## user_problem_statement: "Integrate Google Maps API across BiteGo (Customer, Restaurant, Delivery, Admin) for distance calculation, routing, service-area maps and live tracking. Backend authoritative for delivery distance/charges. Keep Dev OTP. No dummy data."

## backend:
##   - task: "Google Routes API distance for quote & order (Haversine fallback)"
##     implemented: true
##     working: "NA"
##     file: "backend/maps.py, backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Added maps.get_route() calling Google Routes API via httpx with X-Goog-FieldMask; used in /orders/quote and /orders to compute billing distance. Falls back to Haversine when Routes API disabled/unavailable (currently disabled on the provided GCP project, so fallback is active). Order stores route_polyline, distance_source, eta_seconds. Dual-rate math (customer delivery charge vs partner earning) unchanged. Verify quote & order still return correct totals and do not error."
##   - task: "POST /api/maps/route endpoint"
##     implemented: true
##     working: "NA"
##     file: "backend/server.py"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: true
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "Auth-protected endpoint returning {distance_km,duration_seconds,polyline,source}. Verify it returns a valid response (source=haversine while Routes API disabled)."

## frontend:
##   - task: "Maps across all apps (react-native-maps native, Google JS web)"
##     implemented: true
##     working: "NA"
##     file: "frontend/src/components/AppMap.tsx, AppMap.web.tsx"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: false
##     status_history:
##         -working: "NA"
##         -agent: "main"
##         -comment: "BLOCKED on Google Cloud: Maps JavaScript API & Maps SDKs are NOT activated on the provided key's project (ApiNotActivatedMapError). Code is complete; maps will render once user enables APIs. Do NOT frontend-test maps until enabled."

## metadata:
##   created_by: "main_agent"
##   version: "1.1"
##   test_sequence: 3
##   run_ui: false

## test_plan:
##   current_focus:
##     - "Google Routes API distance for quote & order (Haversine fallback)"
##     - "POST /api/maps/route endpoint"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"

## agent_communication:
##     -agent: "main"
##     -message: "Google Maps backend integration done with Haversine fallback (Routes API disabled on project). Please backend-test only: (1) customer quote & order placement still compute correct dual-rate totals and store route fields without errors; (2) /api/maps/route works. Frontend maps are blocked until the user enables Maps JS/SDK APIs in Google Cloud — skip frontend map testing. Admin admin@bitego.app / BiteGoAdmin@123. Seed via POST /api/admin/seed."

## ---- Iteration 4 (Cloudinary→Object Storage image upload, logout fix) ----
## backend:
##   - task: "Image upload (Emergent Object Storage) + public serve"
##     implemented: true
##     working: true
##     file: "backend/storage.py, backend/server.py"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "POST /api/upload (auth restaurant/admin, multipart) stores in Emergent Object Storage; GET /api/files/{path} serves publicly. Verified via curl + web UI upload (admin banner). Validate: auth required (401 without token), size/type limits, returns {path,url}; served file 200 with correct content-type."
##   - task: "Admin restaurant media endpoint"
##     implemented: true
##     working: true
##     file: "backend/routes_admin.py"
##     stuck_count: 0
##     priority: "medium"
##     needs_retesting: true
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "PUT /api/admin/restaurants/{rid}/media sets logo/cover/image. Verified via UI (banner appeared + persisted). Confirm reflected in GET /api/restaurants (customer discovery)."
## frontend:
##   - task: "Restaurant/Admin image upload UI + logout fix"
##     implemented: true
##     working: true
##     file: "frontend/src/components/image-upload.tsx, app/(restaurant)/register.tsx, menu-edit.tsx, profile.tsx, app/(admin)/restaurants.tsx, src/context/auth.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##         -working: true
##         -agent: "main"
##         -comment: "Replaced ALL image URL text fields with ImageUpload (expo-image-picker). Restaurant register (logo+banner), menu-edit (food image), profile (change banner/logo), admin restaurants (change banner). Uploaded images render in Customer app (cards read cover/image/food.image). Dummy Unsplash placeholders removed (neutral icon fallback). Logout now navigates to /(auth)/login via router.replace for ALL apps (was the reported restaurant-logout bug). Admin web upload verified working."

## agent_communication:
##     -agent: "main"
##     -message: "Iteration 4: image uploads via Emergent Object Storage (Cloudinary keys were not provided; managed storage needs none). Logout fixed globally. Please test BOTH backend and frontend. SKIP Google map RENDERING (Maps APIs disabled on the GCP project) but DO test order flow, /api/maps/route fallback, upload/serve, admin media, and restaurant->customer image visibility. Admin admin@bitego.app / BiteGoAdmin@123. OTP dev flow returns dev_otp. Seeded restaurant phones 9000000001/9000000002 (role=restaurant), delivery 9000000009 (role=delivery)."
