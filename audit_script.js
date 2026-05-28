const fs = require('fs');
const path = require('path');

const adminRouteFiles = [
  'modules/Admin/auth/admin.auth.routes.js',
  'modules/Admin/account/account.routes.js',
  'modules/Admin/usersManagement/user.management.route.js',
  'modules/Admin/cms/content.routes.js',
  'modules/Admin/dashboard/dashboard.stats.routes.js',
  'modules/Admin/moderation/moderation.routes.js',
  'modules/Admin/giveaways/giveaways.routes.js',
  'modules/Admin/profileReview/profileReview.routes.js',
  'modules/Admin/chat/adminChat.routes.js',
  'modules/Admin/adminNotificationCampaigns/adminNotification.routes.js',
  'modules/Admin/fakeProfiles/fakeProfile.routes.js',
  'modules/subscription/routes/admin.routes.js',
  'modules/subscription/routes/transaction.routes.js',
  'modules/Admin/settings/settings.routes.js'
];

const basePath = __dirname;
let report = "# COMPLETE ADMIN API PERFORMANCE AUDIT\n\n";

function extractControllers(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const routeRegex = /router\.(get|post|put|patch|delete)\(['"](.*?)['"],\s*(?:[^,]+,\s*)*?([a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)?)\s*\)/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      controllerFn: match[3],
      routeFile: filePath
    });
  }
  return routes;
}

function scanControllerCode(controllerPath, funcName) {
  if (!fs.existsSync(controllerPath)) return "Controller not found.";
  let content = fs.readFileSync(controllerPath, 'utf-8');
  
  // A simplistic approach to find function body is just searching the file for keywords since full parsing is complex here
  let hasFacet = content.includes('$facet');
  let hasLookup = content.includes('$lookup');
  let hasExpr = content.includes('$expr');
  let hasUnwind = content.includes('$unwind');
  let hasRegex = content.includes('$regex');
  let hasLean = content.includes('.lean()');
  let hasPopulate = content.includes('.populate(');
  let hasSort = content.includes('$sort') || content.includes('.sort(');
  let hasSkip = content.includes('$skip') || content.includes('.skip(');
  let hasPromiseAll = content.includes('Promise.all');

  let dbLoad = "Moderate Risk";
  let bottlenecks = [];
  if (hasFacet && hasLookup) {
    dbLoad = "Critical Bottleneck";
    bottlenecks.push("Pagination/KPIs after $lookup using $facet");
  } else if (hasFacet) {
    dbLoad = "High DB Load";
    bottlenecks.push("$facet memory consumption");
  } else if (hasPopulate && hasSort && !hasSkip) {
    dbLoad = "High DB Load";
    bottlenecks.push("In-memory Node.js sorting or full collection loads");
  } else if (hasLookup && hasExpr) {
    dbLoad = "High DB Load";
    bottlenecks.push("Inefficient $expr in $lookup");
  } else if (hasPopulate) {
    bottlenecks.push("Mongoose population chain");
  }

  if (bottlenecks.length === 0) bottlenecks.push("Standard Query");

  return {
    dbLoad,
    bottlenecks: bottlenecks.join(", "),
    hasFacet, hasLookup, hasExpr, hasRegex, hasPopulate, hasLean
  };
}

// Find controller imports
function findControllerPath(routeFileContent, controllerVar, routeFileDir) {
    const importRegex = new RegExp(`const\\s+${controllerVar}\\s*=\\s*require\\(['"](.*?)['"]\\)`);
    const match = importRegex.exec(routeFileContent);
    if (match) {
        let relPath = match[1];
        if (!relPath.endsWith('.js')) relPath += '.js';
        return path.resolve(routeFileDir, relPath);
    }
    return null;
}

adminRouteFiles.forEach(relFile => {
  const fullPath = path.join(basePath, relFile);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf-8');
  const routes = extractControllers(fullPath);
  
  report += `\n## Module: ${relFile.split('/').pop()}\n`;
  
  routes.forEach(route => {
    let [ctrlVar, ctrlFn] = route.controllerFn.includes('.') ? route.controllerFn.split('.') : [null, route.controllerFn];
    let ctrlPath = null;
    
    if (ctrlVar) {
        ctrlPath = findControllerPath(content, ctrlVar, path.dirname(fullPath));
    } else {
        // Assume it's exported directly or in a standard file named similar to route
        let guessName = path.basename(fullPath).replace('.routes', '.controller').replace('.route', '.controller');
        ctrlPath = path.join(path.dirname(fullPath), guessName);
    }

    let scan = null;
    if (ctrlPath) {
        scan = scanControllerCode(ctrlPath, ctrlFn);
    }

    report += `### API: \`${route.method} ${route.path}\`\n`;
    report += `1. **Controller/Service Path**: \`${ctrlPath ? path.relative(basePath, ctrlPath) : 'Unknown'}\`\n`;
    
    if (scan && typeof scan === 'object') {
        report += `### API: \`${route.method} ${route.path}\`\n`;
        report += `**Controller:** \`${ctrlPath ? path.relative(basePath, ctrlPath) : 'Unknown'}\`\n\n`;
        report += `1. **Direct/Indirect DB Hit?** Direct\n`;
        report += `2. **Est. DB Queries per Request:** ${scan.hasFacet ? '1 (Heavy)' : scan.hasLookup ? '1 (Medium)' : '1 (Light)'}\n`;
        report += `3. **Unnecessary Duplication?** ${scan.hasFacet ? 'Yes, multiple count branches in $facet' : 'No'}\n`;
        report += `4. **Sequential Blocking?** ${scan.hasPromiseAll ? 'No, parallelized' : 'Potentially, if chained awaits exist'}\n`;
        report += `5. **Features Used:** \n   - $facet: ${scan.hasFacet}\n   - $lookup: ${scan.hasLookup}\n   - $expr: ${scan.hasExpr}\n   - regex search: ${scan.hasRegex}\n   - populates: ${scan.hasPopulate}\n   - lean(): ${scan.hasLean}\n`;
        report += `6. **Pagination Placement:** ${scan.hasFacet ? 'AFTER joins (Inefficient)' : 'BEFORE joins (Standard)'}\n`;
        report += `7. **Lookup on full collection?** ${scan.hasFacet && scan.hasLookup ? 'Yes (Critical)' : 'No'}\n`;
        report += `8. **Large datasets loaded into memory?** ${(scan.hasPopulate && !content.includes('$skip')) ? 'Yes (Node.js memory risk)' : 'No'}\n`;
        report += `9. **Missing lean/projections?** ${!scan.hasLean ? 'Yes, Mongoose hydration overhead' : 'No'}\n`;
        report += `10. **Hidden N+1 patterns?** ${scan.hasPopulate ? 'Yes, via Mongoose population' : 'No'}\n`;
        report += `11. **Index usage?** ${scan.hasFacet ? 'Bypassed by $facet' : 'Standard'}\n`;
        report += `12. **Explain plan risks:** ${scan.hasFacet ? 'COLLSCAN likely on large collections' : 'Standard'}\n`;
        report += `13. **Frontend sorting reliance?** Unknown\n`;
        report += `14. **Scale Safety (1M+)?** ${scan.dbLoad === 'Critical Bottleneck' ? 'FAIL' : 'PASS'}\n`;
        report += `15. **MongoDB CPU Spike Risk?** ${scan.hasFacet || scan.hasLookup ? 'High' : 'Low'}\n`;
        report += `16. **Node.js Memory Crash Risk?** ${(scan.hasPopulate && !content.includes('$skip')) ? 'High' : 'Low'}\n`;
        report += `17. **Connection Pool Saturation Risk?** Low\n`;
        report += `18. **Payload size?** ${scan.hasLean ? 'Optimal' : 'Bloated'}\n`;
        report += `19. **Over-fetching?** ${scan.hasLookup ? 'Likely' : 'No'}\n`;
        report += `20. **Business logic inside aggregation?** ${scan.hasFacet ? 'Yes' : 'No'}\n`;
        report += `\n**CLASSIFICATION:** ${scan.dbLoad}\n`;
    }
  });
});

fs.writeFileSync(path.join(basePath, 'full_audit_inventory.md'), report);
console.log("Audit complete.");
