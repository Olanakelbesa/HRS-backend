"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resyncAllEmbeddings = resyncAllEmbeddings;
const repository_1 = require("../search/repository");
async function resyncAllEmbeddings() {
    return (0, repository_1.resyncAllPropertyEmbeddings)();
}
