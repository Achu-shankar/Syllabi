"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var supabase_js_1 = require("@supabase/supabase-js");
var notion_1 = require("../src/services/skills/builtin/notion");
dotenv_1.default.config({ path: '.env.local' });
dotenv_1.default.config();
function generateEmbeddingForDescription(description) {
    return __awaiter(this, void 0, void 0, function () {
        var response, data, embedding, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    console.log("[Embedding] Generating embedding for: \"".concat(description.substring(0, 50), "...\""));
                    if (!process.env.OPENAI_API_KEY) {
                        console.warn('[Embedding] OPENAI_API_KEY not found, skipping embedding generation');
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, fetch('https://api.openai.com/v1/embeddings', {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(process.env.OPENAI_API_KEY),
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                model: 'text-embedding-3-small',
                                input: description,
                                dimensions: 1536,
                            }),
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("OpenAI API error: ".concat(response.status, " ").concat(response.statusText));
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    embedding = data.data[0].embedding;
                    console.log("[Embedding] Successfully generated embedding (".concat(embedding.length, " dimensions)"));
                    return [2 /*return*/, embedding];
                case 3:
                    error_1 = _a.sent();
                    console.error("[Embedding] Failed to generate embedding:", error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function createScriptServiceClient() {
    var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is required. Please check your .env.local file.');
    }
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required. Please add it to your .env.local file.');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
function seedNotionBuiltinSkills() {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, _i, NOTION_SKILL_DEFINITIONS_1, skill, embedding, _a, existingSkill, checkError, skillData, result, embeddingStatus, error_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    supabase = createScriptServiceClient();
                    console.log('🚀 Starting Notion built-in skills seeding...');
                    console.log("\uD83D\uDCE6 Found ".concat(notion_1.NOTION_SKILL_DEFINITIONS.length, " skill(s) to seed"));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 11, , 12]);
                    _i = 0, NOTION_SKILL_DEFINITIONS_1 = notion_1.NOTION_SKILL_DEFINITIONS;
                    _b.label = 2;
                case 2:
                    if (!(_i < NOTION_SKILL_DEFINITIONS_1.length)) return [3 /*break*/, 10];
                    skill = NOTION_SKILL_DEFINITIONS_1[_i];
                    console.log("\uD83D\uDCDD Seeding skill: ".concat(skill.name, " (").concat(skill.display_name, ")"));
                    return [4 /*yield*/, generateEmbeddingForDescription(skill.description)];
                case 3:
                    embedding = _b.sent();
                    return [4 /*yield*/, supabase
                            .from('skills')
                            .select('id, name')
                            .eq('name', skill.name)
                            .eq('type', 'builtin')
                            .maybeSingle()];
                case 4:
                    _a = _b.sent(), existingSkill = _a.data, checkError = _a.error;
                    if (checkError) {
                        console.error("\u274C Error checking existing skill ".concat(skill.name, ":"), checkError.message);
                        return [3 /*break*/, 9];
                    }
                    skillData = __assign({ name: skill.name, display_name: skill.display_name, description: skill.description, category: skill.category, type: skill.type, is_active: skill.is_active, user_id: skill.user_id, function_schema: skill.function_schema, configuration: skill.configuration, updated_at: new Date().toISOString() }, (embedding && { embedding: embedding }));
                    result = void 0;
                    if (!existingSkill) return [3 /*break*/, 6];
                    console.log("\uD83D\uDD04 Updating existing skill: ".concat(skill.name));
                    return [4 /*yield*/, supabase
                            .from('skills')
                            .update(skillData)
                            .eq('id', existingSkill.id)
                            .select('id, name, display_name')
                            .single()];
                case 5:
                    result = _b.sent();
                    return [3 /*break*/, 8];
                case 6:
                    console.log("\u2795 Creating new skill: ".concat(skill.name));
                    return [4 /*yield*/, supabase
                            .from('skills')
                            .insert(skillData)
                            .select('id, name, display_name')
                            .single()];
                case 7:
                    result = _b.sent();
                    _b.label = 8;
                case 8:
                    if (result.error) {
                        console.error("\u274C Failed to seed skill ".concat(skill.name, ":"), result.error.message);
                        return [3 /*break*/, 9];
                    }
                    embeddingStatus = embedding ? '✅ with embedding' : '⚠️ without embedding';
                    console.log("\u2705 Successfully seeded: ".concat(result.data.name, " (ID: ").concat(result.data.id, ") ").concat(embeddingStatus));
                    _b.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 2];
                case 10:
                    console.log('🎉 Notion built-in skills seeding completed successfully!');
                    console.log('\n📋 Next steps:');
                    console.log('1. Users can now see these skills in their skills page');
                    console.log('2. To use them, users need to connect their Notion integration');
                    console.log('3. The skills will automatically appear when Notion is connected');
                    console.log('4. Skills with embeddings will be better discoverable in semantic search');
                    return [3 /*break*/, 12];
                case 11:
                    error_2 = _b.sent();
                    console.error('💥 Fatal error during seeding:', error_2);
                    process.exit(1);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
if (require.main === module) {
    seedNotionBuiltinSkills()
        .then(function () {
        console.log('🏁 Script completed');
        process.exit(0);
    })
        .catch(function (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}
