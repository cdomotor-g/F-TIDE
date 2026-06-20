import { state } from './state.js';
import { uniqueStrings } from './utils.js';

export function buildIncomingMapForTree(tree) {
  var incoming = {};
  if (!tree || !tree.nodes) return incoming;
  Object.keys(tree.nodes).forEach(function (nodeId) {
    var node = tree.nodes[nodeId];
    if (!node || !Array.isArray(node.options)) return;
    node.options.forEach(function (option) {
      var targetId = option && typeof option.next !== 'undefined' ? String(option.next || '').trim() : '';
      if (!targetId) return;
      if (!incoming[targetId]) incoming[targetId] = 0;
      incoming[targetId] += 1;
    });
  });
  return incoming;
}

export function getOrphanNodeIds(tree) {
  if (!tree || !tree.nodes || !tree.startNode) return [];
  var incoming = buildIncomingMapForTree(tree);
  return Object.keys(tree.nodes).filter(function (id) {
    return id !== tree.startNode && !incoming[id];
  }).sort();
}

export function getTreeValidationWarnings(tree) {
  if (!tree) return [];
  var warnings = [];
  getOrphanNodeIds(tree).forEach(function (id) {
    warnings.push("Orphan node '" + id + "' has no incoming references.");
  });
  Object.keys(tree.nodes || {}).forEach(function (nodeId) {
    var node = tree.nodes[nodeId] || {};
    if (!Array.isArray(node.options) || node.options.length === 0) {
      warnings.push("Node '" + nodeId + "' has no options.");
      return;
    }
    node.options.forEach(function (option, index) {
      var label = String(option && option.label || '').trim();
      var next = String(option && option.next || '').trim();
      if (!label && !next) {
        warnings.push("Node '" + nodeId + "' has an empty option row at position " + (index + 1) + ".");
        return;
      }
      if (!label) warnings.push("Node '" + nodeId + "' option " + (index + 1) + " is missing a label.");
      if (!next) {
        warnings.push("Node '" + nodeId + "' option '" + (label || ('Option ' + (index + 1))) + "' is missing a target.");
        return;
      }
      if (!tree.nodes[next] && !tree.results[next]) {
        warnings.push("Node '" + nodeId + "' option '" + (label || ('Option ' + (index + 1))) + "' points to missing target '" + next + "'.");
      }
    });
  });
  return uniqueStrings(warnings);
}

export function validateLinks(payload) {
  if (typeof payload.links === 'undefined') return;
  if (!Array.isArray(payload.links)) throw new Error("Payload '" + payload.id + "' has invalid 'links'. Use an array.");
  payload.links.forEach(function (link, idx) {
    if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error("Payload '" + payload.id + "' link " + (idx + 1) + ' must be an object.');
    if (typeof link.url !== 'undefined' && link.url !== null && typeof link.url !== 'string') {
      throw new Error("Payload '" + payload.id + "' link " + (idx + 1) + " has invalid 'url'.");
    }
  });
}

export function validateSingleNode(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) throw new Error('Each node must be an object.');
  if (!node.id) throw new Error("Each node must have an 'id'.");
  if (!String(node.question || '').trim()) throw new Error("Node '" + node.id + "' is missing 'question'.");
  if (!Array.isArray(node.options)) throw new Error("Node '" + node.id + "' is missing 'options' array.");
  if (node.options.length === 0) throw new Error("Node '" + node.id + "' must have at least one option.");
  var seenLabels = new Set();
  node.options.forEach(function (option, idx) {
    if (!option || typeof option !== 'object' || Array.isArray(option)) throw new Error("Node '" + node.id + "' option " + (idx + 1) + ' must be an object.');
    var label = String(option.label || '').trim();
    var next = String(option.next || '').trim();
    if (!label) throw new Error("Node '" + node.id + "' option " + (idx + 1) + " is missing 'label'.");
    if (!next) throw new Error("Node '" + node.id + "' option '" + label + "' is missing 'next'.");
    if (seenLabels.has(label.toLowerCase())) throw new Error("Node '" + node.id + "' has duplicate option label '" + label + "'.");
    seenLabels.add(label.toLowerCase());
  });
  validateLinks(node);
}

export function validateSingleResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Each result must be an object.');
  if (!result.id) throw new Error("Each result must have an 'id'.");
  if (!String(result.title || '').trim()) throw new Error("Result '" + result.id + "' is missing 'title'.");
  if (typeof result.rationale !== 'undefined' && typeof result.rationale !== 'string') throw new Error("Result '" + result.id + "' has invalid 'rationale'.");
  validateLinks(result);
}

export function validateTree(tree) {
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) throw new Error('JSON root must be an object.');
  if (!tree.startNode) throw new Error("Missing 'startNode'.");
  if (!tree.nodes || typeof tree.nodes !== 'object' || Array.isArray(tree.nodes)) throw new Error("Missing or invalid 'nodes'.");
  if (!tree.results || typeof tree.results !== 'object' || Array.isArray(tree.results)) throw new Error("Missing or invalid 'results'.");
  if (!tree.nodes[tree.startNode]) throw new Error("startNode '" + tree.startNode + "' does not exist in nodes.");

  var seenIds = new Set();
  Object.keys(tree.nodes).forEach(function (key) {
    var node = tree.nodes[key];
    validateSingleNode(node);
    if (node.id !== key) throw new Error("Node key '" + key + "' does not match node.id '" + node.id + "'.");
    if (seenIds.has(node.id)) throw new Error("Duplicate payload id '" + node.id + "'.");
    seenIds.add(node.id);
  });
  Object.keys(tree.results).forEach(function (key) {
    var result = tree.results[key];
    validateSingleResult(result);
    if (result.id !== key) throw new Error("Result key '" + key + "' does not match result.id '" + result.id + "'.");
    if (seenIds.has(result.id)) throw new Error("Duplicate payload id '" + result.id + "'.");
    seenIds.add(result.id);
  });
  Object.values(tree.nodes).forEach(function (node) {
    node.options.forEach(function (option) {
      if (!tree.nodes[option.next] && !tree.results[option.next]) {
        throw new Error("Node '" + node.id + "' option '" + option.label + "' points to missing target '" + option.next + "'.");
      }
    });
  });
  return getTreeValidationWarnings(tree);
}

export function formatTreeValidationWarningSummary(tree) {
  var warnings = getTreeValidationWarnings(tree);
  if (!warnings.length) return '';
  if (warnings.length === 1) return warnings[0];
  return warnings.length + ' warnings: ' + warnings.join(' ');
}
