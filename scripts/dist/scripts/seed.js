"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const models_1 = require("../lib/models");
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/yardstick';
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Connecting to database...');
        yield mongoose_1.default.connect(MONGODB_URI);
        console.log('Database connected.');
        console.log('Clearing existing data...');
        yield models_1.Tenant.deleteMany({});
        yield models_1.User.deleteMany({});
        console.log('Existing data cleared.');
        console.log('Seeding tenants...');
        const tenants = yield models_1.Tenant.create([
            { name: 'Acme', slug: 'acme', plan: 'Free' },
            { name: 'Globex', slug: 'globex', plan: 'Pro' },
        ]);
        console.log('Tenants seeded.');
        const acmeTenant = tenants[0];
        const globexTenant = tenants[1];
        console.log('Seeding users...');
        const password = yield bcrypt_1.default.hash('password', 10);
        yield models_1.User.create([
            { email: 'admin@acme.test', name: 'Acme Admin', role: 'Admin', tenant: acmeTenant._id, password },
            { email: 'user@acme.test', name: 'Acme User', role: 'Member', tenant: acmeTenant._id, password },
            { email: 'admin@globex.test', name: 'Globex Admin', role: 'Admin', tenant: globexTenant._id, password },
            { email: 'user@globex.test', name: 'Globex User', role: 'Member', tenant: globexTenant._id, password },
        ]);
        console.log('Users seeded.');
        yield mongoose_1.default.connection.close();
        console.log('Database connection closed.');
    });
}
seed().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map