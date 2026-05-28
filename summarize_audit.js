const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'full_audit_inventory.md'), 'utf-8');

let summary = "# Admin API Inventory & Risk Classification\n\n";
summary += "This document categorizes all Admin APIs based on the deep performance audit.\n\n";
summary += "| API Route | Controller | DB Load Risk | Bottlenecks |\n";
summary += "|---|---|---|---|\n";

const blocks = content.split('### API: `');
for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const routeMatch = block.match(/^(.*?)\`/);
    const ctrlMatch = block.match(/\*\*Controller:\*\* \`(.*?)\`/);
    const riskMatch = block.match(/\*\*CLASSIFICATION:\*\* (.*?)\n/);
    
    // Check if bottleneck is standard or critical
    const isCritical = block.includes('Critical Bottleneck');
    const isHigh = block.includes('High DB Load');
    let bottlenecks = "Standard";
    if (isCritical) bottlenecks = "Pagination/KPIs after $lookup using $facet";
    else if (isHigh) bottlenecks = "Mongoose population/sorting overhead";

    if (routeMatch && ctrlMatch && riskMatch) {
        summary += `| \`${routeMatch[1]}\` | \`${path.basename(ctrlMatch[1])}\` | **${riskMatch[1]}** | ${bottlenecks} |\n`;
    }
}

fs.writeFileSync(path.join(__dirname, 'summary_audit.md'), summary);
