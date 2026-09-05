/**
 * Root entry point for MyHealthChain Platform.
 * Provides service diagnostic info and guidance for running frontend/backend servers.
 */
console.log("=================================================");
console.log("🏥 MyHealthChain Healthcare System Platform");
console.log("=================================================");
console.log("To start individual services:");
console.log("  • Backend API:      cd backend && uvicorn main:app --reload");
console.log("  • Frontend UI:     cd frontend && npm run dev");
console.log("  • WhatsApp GW:     cd whatsapp-gateway && npm start");
console.log("  • All Services:    ./start_all.sh or ./start_all.ps1");
console.log("  • Docker Stack:    docker-compose up --build");
console.log("=================================================");
