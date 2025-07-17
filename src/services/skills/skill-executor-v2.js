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
exports.executeSkill = executeSkill;
exports.validateSkillParameters = validateSkillParameters;
exports.getSkillExampleParameters = getSkillExampleParameters;
exports.registerBuiltinSkill = registerBuiltinSkill;
exports.getRegisteredBuiltinSkills = getRegisteredBuiltinSkills;
var skills_db_queries_v2_1 = require("@/app/dashboard/libs/skills_db_queries_v2");
var slack_1 = require("./builtin/slack");
var discord_1 = require("./builtin/discord");
var google_drive_1 = require("./builtin/google_drive");
var gmail_1 = require("./builtin/gmail");
var google_calendar_1 = require("./builtin/google_calendar");
var notion_1 = require("./builtin/notion");
var service_1 = require("@/utils/supabase/service");
/**
 * Built-in skills registry
 * This registry maps skill names to their implementation functions
 */
var BUILTIN_SKILLS_REGISTRY = __assign(__assign(__assign(__assign(__assign(__assign({}, slack_1.SLACK_SKILL_IMPLEMENTATIONS), discord_1.DISCORD_SKILL_IMPLEMENTATIONS), google_drive_1.GOOGLE_DRIVE_SKILL_IMPLEMENTATIONS), gmail_1.GMAIL_SKILL_IMPLEMENTATIONS), google_calendar_1.GOOGLE_CALENDAR_SKILL_IMPLEMENTATIONS), notion_1.NOTION_SKILL_IMPLEMENTATIONS);
/**
 * Fetch integration ID for a chatbot and integration type
 */
function getIntegrationIdForChatbot(chatbotId, integrationType) {
    return __awaiter(this, void 0, void 0, function () {
        var supabase, _a, allIntegrations, allError, workspaceNames, selectedIntegration, workspaceName, error_1;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _d.trys.push([0, 2, , 3]);
                    supabase = (0, service_1.createServiceClient)();
                    return [4 /*yield*/, supabase
                            .from('chatbot_integrations')
                            .select("\n        integration_id,\n        connected_integrations!inner(\n          id,\n          integration_type,\n          metadata\n        )\n      ")
                            .eq('chatbot_id', chatbotId)
                            .eq('connected_integrations.integration_type', integrationType)
                            .order('created_at', { ascending: false })];
                case 1:
                    _a = _d.sent(), allIntegrations = _a.data, allError = _a.error;
                    if (allError) {
                        console.error("Failed to fetch integrations: ".concat(allError.message));
                        return [2 /*return*/, null];
                    }
                    if (!allIntegrations || allIntegrations.length === 0) {
                        return [2 /*return*/, null];
                    }
                    // If multiple integrations exist, log a warning and use the most recent
                    if (allIntegrations.length > 1) {
                        workspaceNames = allIntegrations.map(function (int) {
                            var metadata = int.connected_integrations.metadata;
                            return (metadata === null || metadata === void 0 ? void 0 : metadata.team_name) || (metadata === null || metadata === void 0 ? void 0 : metadata.guild_name) || (metadata === null || metadata === void 0 ? void 0 : metadata.workspace_name) || 'Unknown';
                        });
                        console.warn("[Integration Warning] Chatbot ".concat(chatbotId, " has ").concat(allIntegrations.length, " ").concat(integrationType, " integrations: [").concat(workspaceNames.join(', '), "]. Using most recent: \"").concat(workspaceNames[0], "\""));
                        console.warn("[Integration Warning] Consider using chatbot integration management to specify which ".concat(integrationType, " workspace to use."));
                    }
                    selectedIntegration = allIntegrations[0];
                    workspaceName = ((_b = selectedIntegration.connected_integrations.metadata) === null || _b === void 0 ? void 0 : _b.team_name) ||
                        ((_c = selectedIntegration.connected_integrations.metadata) === null || _c === void 0 ? void 0 : _c.guild_name) ||
                        'Unknown Workspace';
                    console.log("[Integration] Using ".concat(integrationType, " integration: \"").concat(workspaceName, "\" for chatbot ").concat(chatbotId));
                    return [2 /*return*/, selectedIntegration.integration_id];
                case 2:
                    error_1 = _d.sent();
                    console.error('Error fetching integration ID:', error_1);
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Auto-fetch integration ID for built-in skills that require it
 */
function ensureIntegrationId(skill, context) {
    return __awaiter(this, void 0, void 0, function () {
        var integrationType, chatbotId, integrationId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // If integration ID is already provided, return as-is
                    if (context.integrationId) {
                        return [2 /*return*/, context];
                    }
                    integrationType = null;
                    if (skill.name.startsWith('slack_')) {
                        integrationType = 'slack';
                    }
                    else if (skill.name.startsWith('discord_')) {
                        integrationType = 'discord';
                    }
                    else if (skill.name.startsWith('google_drive_')) {
                        integrationType = 'google';
                    }
                    else if (skill.name.startsWith('gmail_')) {
                        integrationType = 'google';
                    }
                    else if (skill.name.startsWith('google_calendar_')) {
                        integrationType = 'google';
                    }
                    else if (skill.name.startsWith('notion_')) {
                        integrationType = 'notion';
                    }
                    // If this skill doesn't require an integration, return as-is
                    if (!integrationType) {
                        return [2 /*return*/, context];
                    }
                    // Validate required context
                    if (!context.chatSessionId) {
                        throw new Error("Chat session required for ".concat(integrationType, " skills"));
                    }
                    chatbotId = context.chatbotId;
                    if (!chatbotId) {
                        throw new Error("Chatbot ID required for ".concat(integrationType, " skills"));
                    }
                    return [4 /*yield*/, getIntegrationIdForChatbot(chatbotId, integrationType)];
                case 1:
                    integrationId = _a.sent();
                    if (!integrationId) {
                        throw new Error("No active ".concat(integrationType, " integration found for this chatbot. Please connect ").concat(integrationType, " in the chatbot settings."));
                    }
                    console.log("Auto-fetched ".concat(integrationType, " integration ID: ").concat(integrationId, " for chatbot ").concat(chatbotId));
                    return [2 /*return*/, __assign(__assign({}, context), { integrationId: integrationId })];
            }
        });
    });
}
/**
 * Execute a custom skill by making HTTP request to user's endpoint
 */
function executeCustomSkill(skill, parameters) {
    return __awaiter(this, void 0, void 0, function () {
        var config, webhookConfig, webhookUrl, headers_1, method, requestInit, url_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    config = __assign(__assign({}, skill.configuration), skill.association.custom_config);
                    webhookConfig = void 0;
                    if (config.webhook_config) {
                        // New structure: { webhook_config: { url, method, headers, timeout_ms } }
                        webhookConfig = config.webhook_config;
                    }
                    else {
                        // Old/legacy structure: { url, method, headers, timeout_ms }
                        webhookConfig = config;
                    }
                    webhookUrl = webhookConfig.url || config.webhook_url;
                    if (!webhookUrl) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Webhook URL not configured',
                            }];
                    }
                    headers_1 = {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Syllabi-Skills/2.0',
                    };
                    // Add custom headers if they exist
                    if (webhookConfig.headers && typeof webhookConfig.headers === 'object') {
                        Object.entries(webhookConfig.headers).forEach(function (_a) {
                            var key = _a[0], value = _a[1];
                            if (typeof key === 'string' && typeof value === 'string') {
                                headers_1[key] = value;
                            }
                        });
                    }
                    method = webhookConfig.method || 'POST';
                    requestInit = {
                        method: method.toUpperCase(),
                        headers: headers_1,
                        signal: AbortSignal.timeout(webhookConfig.timeout_ms || 30000),
                    };
                    if (!['POST', 'PUT', 'PATCH'].includes(requestInit.method)) return [3 /*break*/, 1];
                    requestInit.body = JSON.stringify(parameters);
                    return [3 /*break*/, 3];
                case 1:
                    if (!(method.toUpperCase() === 'GET' && Object.keys(parameters).length > 0)) return [3 /*break*/, 3];
                    url_1 = new URL(webhookUrl);
                    Object.entries(parameters).forEach(function (_a) {
                        var key = _a[0], value = _a[1];
                        if (value !== null && value !== undefined) {
                            url_1.searchParams.append(key, String(value));
                        }
                    });
                    return [4 /*yield*/, makeHttpRequest(url_1.toString(), requestInit)];
                case 2: return [2 /*return*/, _a.sent()];
                case 3: return [4 /*yield*/, makeHttpRequest(webhookUrl, requestInit)];
                case 4: return [2 /*return*/, _a.sent()];
                case 5:
                    error_2 = _a.sent();
                    if (error_2 instanceof Error) {
                        if (error_2.name === 'AbortError') {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Request timeout',
                                }];
                        }
                        return [2 /*return*/, {
                                success: false,
                                error: error_2.message,
                            }];
                    }
                    return [2 /*return*/, {
                            success: false,
                            error: 'Unknown error occurred',
                        }];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/**
 * Execute a built-in skill using the registry
 */
function executeBuiltinSkill(skill, parameters, context) {
    return __awaiter(this, void 0, void 0, function () {
        var skillFunction, updatedContext, result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    skillFunction = BUILTIN_SKILLS_REGISTRY[skill.name];
                    if (!skillFunction) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Built-in skill '".concat(skill.name, "' not found in registry"),
                            }];
                    }
                    return [4 /*yield*/, ensureIntegrationId(skill, context)];
                case 1:
                    updatedContext = _a.sent();
                    return [4 /*yield*/, skillFunction(parameters, updatedContext)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            data: result,
                        }];
                case 3:
                    error_3 = _a.sent();
                    return [2 /*return*/, {
                            success: false,
                            error: error_3 instanceof Error ? error_3.message : 'Unknown error occurred',
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Helper function to make HTTP request
 */
function makeHttpRequest(url, requestInit) {
    return __awaiter(this, void 0, void 0, function () {
        var response, responseData, contentType, jsonError_1, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 10, , 11]);
                    return [4 /*yield*/, fetch(url, requestInit)];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        return [2 /*return*/, {
                                success: false,
                                error: "HTTP ".concat(response.status, ": ").concat(response.statusText),
                            }];
                    }
                    responseData = void 0;
                    contentType = response.headers.get('content-type');
                    if (!(contentType && contentType.includes('application/json'))) return [3 /*break*/, 7];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, response.json()];
                case 3:
                    responseData = _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    jsonError_1 = _a.sent();
                    return [4 /*yield*/, response.text()];
                case 5:
                    responseData = _a.sent();
                    return [3 /*break*/, 6];
                case 6: return [3 /*break*/, 9];
                case 7: return [4 /*yield*/, response.text()];
                case 8:
                    responseData = _a.sent();
                    _a.label = 9;
                case 9: return [2 /*return*/, {
                        success: true,
                        data: responseData,
                    }];
                case 10:
                    error_4 = _a.sent();
                    if (error_4 instanceof Error) {
                        if (error_4.name === 'AbortError') {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Request timeout',
                                }];
                        }
                        return [2 /*return*/, {
                                success: false,
                                error: error_4.message,
                            }];
                    }
                    return [2 /*return*/, {
                            success: false,
                            error: 'Unknown error occurred',
                        }];
                case 11: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main skill execution function
 */
function executeSkill(skill_1, parameters_1) {
    return __awaiter(this, arguments, void 0, function (skill, parameters, context) {
        var startTime, result, status, _a, error_5, executionTime, loggingError_1;
        if (context === void 0) { context = { skillId: skill.id }; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    startTime = Date.now();
                    status = 'pending';
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 10, , 11]);
                    if (!(!skill.is_active || !skill.association.is_active)) return [3 /*break*/, 2];
                    result = {
                        success: false,
                        error: 'Skill is currently disabled',
                    };
                    status = 'error';
                    return [3 /*break*/, 9];
                case 2:
                    _a = skill.type;
                    switch (_a) {
                        case 'custom': return [3 /*break*/, 3];
                        case 'builtin': return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 3: return [4 /*yield*/, executeCustomSkill(skill, parameters)];
                case 4:
                    result = _b.sent();
                    return [3 /*break*/, 8];
                case 5: return [4 /*yield*/, executeBuiltinSkill(skill, parameters, context)];
                case 6:
                    result = _b.sent();
                    return [3 /*break*/, 8];
                case 7:
                    result = {
                        success: false,
                        error: "Unknown skill type: ".concat(skill.type),
                    };
                    _b.label = 8;
                case 8:
                    status = result.success ? 'success' : 'error';
                    _b.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    error_5 = _b.sent();
                    result = {
                        success: false,
                        error: error_5 instanceof Error ? error_5.message : 'Unknown error occurred',
                    };
                    status = 'error';
                    return [3 /*break*/, 11];
                case 11:
                    executionTime = Date.now() - startTime;
                    if (!!context.testMode) return [3 /*break*/, 15];
                    _b.label = 12;
                case 12:
                    _b.trys.push([12, 14, , 15]);
                    return [4 /*yield*/, (0, skills_db_queries_v2_1.createSkillExecution)({
                            skill_id: skill.id,
                            chat_session_id: context.chatSessionId || null,
                            user_id: context.userId || null,
                            channel_type: context.channel || 'web',
                            execution_status: status,
                            input_parameters: parameters,
                            output_result: result.data || null,
                            error_message: result.error || null,
                            execution_time_ms: executionTime,
                        })];
                case 13:
                    _b.sent();
                    return [3 /*break*/, 15];
                case 14:
                    loggingError_1 = _b.sent();
                    // Don't fail the skill execution if logging fails
                    console.warn('Failed to log skill execution (continuing execution):', loggingError_1 instanceof Error ? loggingError_1.message : 'Unknown error');
                    return [3 /*break*/, 15];
                case 15: return [2 /*return*/, result];
            }
        });
    });
}
/**
 * Validate skill parameters against function schema
 */
function validateSkillParameters(skill, parameters) {
    var errors = [];
    var schema = skill.function_schema.parameters;
    if (!schema || !schema.properties) {
        return { valid: true, errors: [] };
    }
    // Check required parameters
    var required = schema.required || [];
    for (var _i = 0, required_1 = required; _i < required_1.length; _i++) {
        var requiredParam = required_1[_i];
        if (!(requiredParam in parameters) || parameters[requiredParam] === undefined || parameters[requiredParam] === null) {
            errors.push("Missing required parameter: ".concat(requiredParam));
        }
    }
    // Validate parameter types (basic validation)
    for (var _a = 0, _b = Object.entries(parameters); _a < _b.length; _a++) {
        var _c = _b[_a], paramName = _c[0], paramValue = _c[1];
        var paramSchema = schema.properties[paramName];
        if (!paramSchema) {
            continue; // Allow extra parameters
        }
        if (paramValue === null || paramValue === undefined) {
            continue; // Already handled in required check
        }
        // Basic type validation
        var expectedType = paramSchema.type;
        var actualType = typeof paramValue;
        if (expectedType === 'string' && actualType !== 'string') {
            errors.push("Parameter ".concat(paramName, " must be a string"));
        }
        else if (expectedType === 'number' && actualType !== 'number') {
            errors.push("Parameter ".concat(paramName, " must be a number"));
        }
        else if (expectedType === 'boolean' && actualType !== 'boolean') {
            errors.push("Parameter ".concat(paramName, " must be a boolean"));
        }
        else if (expectedType === 'array' && !Array.isArray(paramValue)) {
            errors.push("Parameter ".concat(paramName, " must be an array"));
        }
        else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(paramValue))) {
            errors.push("Parameter ".concat(paramName, " must be an object"));
        }
        // Format validation for strings
        if (expectedType === 'string' && paramSchema.format) {
            var stringValue = paramValue;
            switch (paramSchema.format) {
                case 'email':
                    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(stringValue)) {
                        errors.push("Parameter ".concat(paramName, " must be a valid email address"));
                    }
                    break;
                case 'uri':
                case 'url':
                    try {
                        new URL(stringValue);
                    }
                    catch (_d) {
                        errors.push("Parameter ".concat(paramName, " must be a valid URL"));
                    }
                    break;
                case 'date':
                    var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                    if (!dateRegex.test(stringValue)) {
                        errors.push("Parameter ".concat(paramName, " must be a valid date in YYYY-MM-DD format"));
                    }
                    break;
            }
        }
        // Enum validation
        if (paramSchema.enum && !paramSchema.enum.includes(paramValue)) {
            errors.push("Parameter ".concat(paramName, " must be one of: ").concat(paramSchema.enum.join(', ')));
        }
    }
    return {
        valid: errors.length === 0,
        errors: errors,
    };
}
/**
 * Get example parameters for a skill based on its schema
 */
function getSkillExampleParameters(skill) {
    var schema = skill.function_schema.parameters;
    var examples = {};
    if (!schema || !schema.properties) {
        return examples;
    }
    for (var _i = 0, _a = Object.entries(schema.properties); _i < _a.length; _i++) {
        var _b = _a[_i], paramName = _b[0], paramSchema = _b[1];
        var param = paramSchema;
        // Use example if provided
        if (param.example !== undefined) {
            examples[paramName] = param.example;
            continue;
        }
        // Generate example based on type
        switch (param.type) {
            case 'string':
                if (param.format === 'email') {
                    examples[paramName] = 'user@example.com';
                }
                else if (param.format === 'uri' || param.format === 'url') {
                    examples[paramName] = 'https://example.com';
                }
                else if (param.format === 'date') {
                    examples[paramName] = '2024-01-15';
                }
                else if (param.enum && param.enum.length > 0) {
                    examples[paramName] = param.enum[0];
                }
                else {
                    examples[paramName] = param.description ? "Example ".concat(paramName) : 'example';
                }
                break;
            case 'number':
                examples[paramName] = param.minimum || 0;
                break;
            case 'integer':
                examples[paramName] = param.minimum || 1;
                break;
            case 'boolean':
                examples[paramName] = true;
                break;
            case 'array':
                examples[paramName] = [];
                break;
            case 'object':
                examples[paramName] = {};
                break;
            default:
                examples[paramName] = null;
        }
    }
    return examples;
}
/**
 * Register a new built-in skill function
 * This will be used when we implement actual built-in skills
 */
function registerBuiltinSkill(name, implementation) {
    BUILTIN_SKILLS_REGISTRY[name] = implementation;
}
/**
 * Get all registered built-in skill names
 */
function getRegisteredBuiltinSkills() {
    return Object.keys(BUILTIN_SKILLS_REGISTRY);
}
