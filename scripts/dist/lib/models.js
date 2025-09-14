"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Note = exports.User = exports.Tenant = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TenantSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['Free', 'Pro'], default: 'Free' },
});
exports.Tenant = mongoose_1.models.Tenant || mongoose_1.default.model('Tenant', TenantSchema);
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['Admin', 'Member'], required: true },
    tenant: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Tenant', required: true },
});
exports.User = mongoose_1.models.User || mongoose_1.default.model('User', UserSchema);
const NoteSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    tenant: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    author: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
exports.Note = mongoose_1.models.Note || mongoose_1.default.model('Note', NoteSchema);
//# sourceMappingURL=models.js.map