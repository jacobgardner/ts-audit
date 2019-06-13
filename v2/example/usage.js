"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var runtime_check_1 = require("runtime-check");
var CertificateType;
(function (CertificateType) {
    CertificateType["Application"] = "application";
    CertificateType["User"] = "user";
})(CertificateType || (CertificateType = {}));
var key = runtime_check_1.validateInterface({ key: 'thing', certType: 'application' });
var key2 = runtime_check_1.validateInterface({ key: 'thing', certType: 'application' });
var inferred = runtime_check_1.validateInterface({ key: 'thing', certType: 'application' }); // Should error at build
