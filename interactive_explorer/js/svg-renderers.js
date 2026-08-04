export function renderSVG(currentSystem, simulationActive, selectedNodeId, activeStepNodeId) {
    let svgContent = "";

    if (currentSystem === "url_shortener") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="440" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Scope</text>

            <path d="M120 250 L 220 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M380 220 L 460 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M380 280 L 460 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M300 320 L 300 380" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 220 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 220 L 460 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 280 L 460 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M300 320 L 300 380" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">Route53/CDN</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(220, 200)">
                <rect x="0" y="0" width="160" height="120" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="80" y="55" font-family="Outfit" font-size="14" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Redirect</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(460, 130)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Cache</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(460, 290)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora DB</text>
            </g>
            <g class="interactive-node" id="kinesis" transform="translate(230, 380)">
                <rect x="0" y="0" width="140" height="40" rx="8" fill="#111827" stroke="#10b981" stroke-width="1.5" />
                <text x="70" y="25" font-family="Outfit" font-size="10" fill="#10b981" font-weight="700" text-anchor="middle">Kinesis Logs</text>
            </g>
        </svg>`;
    } else if (currentSystem === "pastebin") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Scope</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">CDN/WAF</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Ingest</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 130)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 310)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora DB (Meta)</text>
            </g>
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#009688" font-weight="700" text-anchor="middle">S3 Storage</text>
            </g>
        </svg>`;
    } else if (currentSystem === "file_storage") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Cloud</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 180" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 270 L 420 340" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 180" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 270 L 420 340" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Masters</text>
            </g>
            <g class="interactive-node" id="ec2" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="110" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">EC2 NVMe SSD</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Block storage</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="200" height="110" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB Metadata</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Namespace maps</text>
            </g>
        </svg>`;
    } else if (currentSystem === "food_delivery") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Core</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 360" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 240 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 360" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Engine</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="120" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Geo-spatial Rider Locations</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="100" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Orders & Ledgers</text>
            </g>
            <g class="interactive-node" id="keyspaces" transform="translate(200, 360)">
                <rect x="0" y="0" width="140" height="45" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="27" font-family="Outfit" font-size="10" fill="#009688" font-weight="700" text-anchor="middle">Cassandra Logs</text>
            </g>
        </svg>`;
    } else if (currentSystem === "dropbox") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Subnets</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 200" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 200" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Sync</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Block/Meta Coordinator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="130" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Global Dedupe Index</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="100" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
            </g>
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#009688" font-weight="700" text-anchor="middle">S3 Buckets</text>
            </g>
        </svg>`;
    } else if (currentSystem === "parking_lot") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC range</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 200" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 200" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">API GW / IoT</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Allocation</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Gate Coordinator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="130" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Occupancy Map Grid</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="100" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
            </g>
        </svg>`;
    } else if (currentSystem === "library_management") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Enterprise Library Network)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">API GW /</text>
                <text x="40" y="55" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">Kiosks</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Borrowing Engine</text>
            </g>
            <g class="interactive-node" id="opensearch" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="100" rx="10" fill="#111827" stroke="#c084fc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#c084fc" font-weight="700" text-anchor="middle">OpenSearch</text>
                <text x="100" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Catalog Inverted Index</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 280)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="35" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Redis Hold Queue</text>
                <text x="100" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">ZADD/ZPOPMIN</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(200, 340)">
                <rect x="0" y="0" width="140" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="70" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
            </g>
        </svg>`;
    } else if (currentSystem === "atm_system") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Banking Network Core)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#00e676" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">NLB / ISO</text>
                <text x="40" y="55" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">8583 Switch</text>
            </g>
            <g class="interactive-node" id="cloudhsm" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="90" rx="10" fill="#111827" stroke="#00e676" stroke-width="2" />
                <text x="100" y="40" font-family="Outfit" font-size="13" fill="#00e676" font-weight="700" text-anchor="middle">AWS CloudHSM</text>
                <text x="100" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">DUKPT PIN Decryption</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Saga Coordinator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 280)">
                <rect x="0" y="0" width="200" height="70" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="35" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Redis Cassette Cache</text>
                <text x="100" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Note Allocation Routine</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(200, 340)">
                <rect x="0" y="0" width="140" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="70" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
            </g>
        </svg>`;
    } else if (currentSystem === "rag_pipeline") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Search Network Group)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 240 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ec407a" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 240 L 520 300" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Query</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Orchestrator</text>
            </g>
            <g class="interactive-node" id="opensearch" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">OpenSearch</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Dense & Sparse Indexes</text>
            </g>
            <g class="interactive-node" id="sagemaker" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ec407a" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ec407a" font-weight="700" text-anchor="middle">SageMaker Rerank</text>
            </g>
            <g class="interactive-node" id="bedrock" transform="translate(640, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Bedrock LLM</text>
            </g>
        </svg>`;
    } else if (currentSystem === "elevator_system") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Elevator Control Core)</text>

            <path d="M120 170 L 200 220" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M120 330 L 200 270" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 170 L 200 220" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M120 330 L 200 270" stroke="#00e676" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 170" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 130)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">API Gateway</text>
                <text x="40" y="55" font-family="Outfit" font-size="11" fill="#ff9800" font-weight="700" text-anchor="middle">Lobby Kiosk</text>
            </g>
            <g class="interactive-node" id="mqtt" transform="translate(40, 290)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#00e676" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#00e676" font-weight="700" text-anchor="middle">AWS IoT</text>
                <text x="40" y="55" font-family="Outfit" font-size="11" fill="#00e676" font-weight="700" text-anchor="middle">MQTT Broker</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Dispatch Engine</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">State Grid & Min-Heap Queues</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#4caf50" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Car Registry & Trip Ledger</text>
            </g>
        </svg>`;
    } else if (currentSystem === "hotel_booking") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Hotel Booking Core)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 240 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#00e676" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 240 L 520 300" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">API Gateway</text>
                <text x="40" y="55" font-family="Outfit" font-size="11" fill="#ff9800" font-weight="700" text-anchor="middle">& CloudFront</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Hold & Saga Engine</text>
            </g>
            <g class="interactive-node" id="opensearch" transform="translate(420, 70)">
                <rect x="0" y="0" width="180" height="75" rx="10" fill="#111827" stroke="#00e676" stroke-width="2" />
                <text x="90" y="35" font-family="Outfit" font-size="13" fill="#00e676" font-weight="700" text-anchor="middle">Amazon OpenSearch</text>
                <text x="90" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Spatial Geohash Index</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 180)">
                <rect x="0" y="0" width="180" height="75" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="35" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="90" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">10-Min Hold Locks</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="180" height="75" rx="10" fill="#111827" stroke="#4caf50" stroke-width="2" />
                <text x="90" y="35" font-family="Outfit" font-size="13" fill="#4caf50" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="90" y="55" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">OCC Room Inventory</text>
            </g>
        </svg>`;
    } else if (currentSystem === "vector_database") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Vector Database Subnet)</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 420 200" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 250 L 520 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 420 200" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 250 L 520 300" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#009688" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="ecs" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS proxy</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Coordinator Node</text>
            </g>
            <g class="interactive-node" id="ec2" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="130" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">EC2 Shard Pod</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Memory HNSW Graphs</text>
            </g>
            <g class="interactive-node" id="ebs" transform="translate(420, 300)">
                <rect x="0" y="0" width="200" height="60" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="100" y="35" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">EBS gp3 Volume</text>
            </g>
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#009688" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#009688" font-weight="700" text-anchor="middle">Amazon S3</text>
            </g>
        </svg>`;
    } else if (currentSystem === "chat_gpt") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Scope</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 680 250" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB Ingress</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Orchestrator</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Session</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB History</text>
            </g>
            <g class="interactive-node" id="gpu" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#10b981" font-weight="700" text-anchor="middle">EKS GPU</text>
            </g>
        </svg>`;
    } else if (currentSystem === "ai_agent_framework") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Area</text>

            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 680 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">API GW</text>
            </g>
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="55" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Agent</text>
            </g>
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Mutex</text>
            </g>
            <g class="interactive-node" id="db" transform="translate(420, 290)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="45" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora State</text>
            </g>
            <g class="interactive-node" id="lambda" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">Lambda Tool</text>
            </g>
        </svg>`;
    } else if (currentSystem === "llm_gateway") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="440" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Private App Subnets)</text>

            <!-- Connections -->
            <path id="path1" d="M120 250 L 220 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path2" d="M380 220 L 460 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path3" d="M380 280 L 460 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path4" d="M300 320 L 300 365" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path5" d="M380 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Animation Paths (Conditional) -->
            <path class="data-flow-line" d="M120 250 L 220 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 220 L 460 170" stroke="#f87171" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 280 L 460 330" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M300 320 L 300 365" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M380 250 L 680 250" stroke="#a855f7" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: ALB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <circle cx="40" cy="35" r="16" fill="#ff9800" opacity="0.2" />
                <text x="40" y="39" font-family="Outfit" font-size="12" fill="#ff9800" font-weight="700" text-anchor="middle">ALB</text>
                <text x="40" y="68" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Ingress</text>
            </g>

            <!-- Compute: ECS Proxy -->
            <g class="interactive-node" id="proxy" transform="translate(220, 200)">
                <rect x="0" y="0" width="160" height="120" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <circle cx="80" cy="45" r="22" fill="#3b82f6" opacity="0.2" />
                <text x="80" y="50" font-family="Outfit" font-size="14" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS</text>
                <text x="80" y="90" font-family="Outfit" font-size="11" fill="#f3f4f6" text-anchor="middle">Proxy Engines</text>
            </g>

            <!-- Cache: Redis -->
            <g class="interactive-node" id="redis" transform="translate(460, 120)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="70" y="35" font-family="Outfit" font-size="13" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Cache</text>
                <text x="70" y="60" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Rate Counter</text>
            </g>

            <!-- Key DB: DynamoDB -->
            <g class="interactive-node" id="db" transform="translate(460, 290)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="35" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB</text>
                <text x="70" y="60" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Tenant Registry</text>
            </g>

            <!-- Logging: Kinesis -->
            <g class="interactive-node" id="kinesis" transform="translate(230, 365)">
                <rect x="0" y="0" width="140" height="45" rx="8" fill="#111827" stroke="#10b981" stroke-width="1.5" />
                <text x="70" y="27" font-family="Outfit" font-size="11" fill="#10b981" font-weight="700" text-anchor="middle">Kinesis Firehose</text>
            </g>

            <!-- Outbound: Bedrock API -->
            <g class="interactive-node" id="bedrock" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <circle cx="40" cy="35" r="16" fill="#ab47bc" opacity="0.2" />
                <text x="40" y="39" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Bedrock</text>
                <text x="40" y="68" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Model API</text>
            </g>
        </svg>`;
    } else if (currentSystem === "semantic_search") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC (Search Network Group)</text>

            <!-- Connections -->
            <path id="path1" d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path2" d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path3" d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path4" d="M300 375 L 420 375" stroke="#4b5563" stroke-width="2" fill="none" />
            <path id="path5" d="M560 375 L 610 375 L 610 210" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#c084fc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ec407a" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M300 375 L 420 375" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M560 375 L 610 375 L 610 210" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: ALB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">ALB</text>
            </g>

            <!-- ECS Search Pods -->
            <g class="interactive-node" id="ecs_search" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="45" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Search</text>
                <text x="70" y="70" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">RRF Fusion Pod</text>
            </g>

            <!-- OpenSearch Service -->
            <g class="interactive-node" id="opensearch" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">OpenSearch</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">HNSW Vector + BM25</text>
            </g>

            <!-- SageMaker Rerank -->
            <g class="interactive-node" id="sagemaker" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ec407a" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ec407a" font-weight="700" text-anchor="middle">SageMaker</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Cross-Encoder</text>
            </g>

            <!-- MSK Kafka -->
            <g class="interactive-node" id="msk" transform="translate(200, 350)">
                <rect x="0" y="0" width="100" height="50" rx="8" fill="#111827" stroke="#ff5722" stroke-width="1.5" />
                <text x="50" y="30" font-family="Outfit" font-size="11" fill="#ff5722" font-weight="700" text-anchor="middle">MSK Kafka</text>
            </g>
        </svg>`;
    } else if (currentSystem === "token_streaming") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Private Subnet Groups</text>

            <!-- Connections -->
            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 375 L 420 375" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M520 330 L 520 240" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#f87171" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 375 L 420 375" stroke="#26a69a" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M520 330 L 520 240" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: NLB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB</text>
            </g>

            <!-- EKS Go/Epoll Gateway -->
            <g class="interactive-node" id="eks_gw" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">EKS Gateway</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Go-Epoll Loops</text>
            </g>

            <!-- Redis Pub/Sub -->
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="200" height="120" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="100" y="45" font-family="Outfit" font-size="13" fill="#ef5350" font-weight="700" text-anchor="middle">Redis Pub/Sub</text>
                <text x="100" y="75" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Decouple stream channels</text>
            </g>

            <!-- SQS queue -->
            <g class="interactive-node" id="sqs" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#4caf50" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#4caf50" font-weight="700" text-anchor="middle">SQS Task Queue</text>
            </g>

            <!-- GPU compute worker -->
            <g class="interactive-node" id="gpu" transform="translate(420, 330)">
                <rect x="0" y="0" width="200" height="80" rx="10" fill="#111827" stroke="#26a69a" stroke-width="2" />
                <text x="100" y="35" font-family="Outfit" font-size="13" fill="#26a69a" font-weight="700" text-anchor="middle">EC2 GPU Pool</text>
                <text x="100" y="60" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">vLLM Inference Pods</text>
            </g>
        </svg>`;
    } else if (currentSystem === "api_gateway") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Core Range</text>

            <!-- Connections -->
            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#a855f7" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 680 250" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: NLB -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="13" fill="#ff9800" font-weight="700" text-anchor="middle">NLB</text>
            </g>

            <!-- ECS Envoy Proxy -->
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ECS Envoy</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Proxy Worker</text>
            </g>

            <!-- Redis Cache -->
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ef5350" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ef5350" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Sliding Limit Logs</text>
            </g>

            <!-- DynamoDB config registry -->
            <g class="interactive-node" id="db" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">DynamoDB Rules</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Route Registries</text>
            </g>

            <!-- Cognito Auth -->
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#ab47bc" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#ab47bc" font-weight="700" text-anchor="middle">Cognito JWT</text>
            </g>

            <!-- Target Pods -->
            <g class="interactive-node" id="target" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="40" y="45" font-family="Outfit" font-size="12" fill="#10b981" font-weight="700" text-anchor="middle">Target Pods</text>
            </g>
        </svg>`;
    } else if (currentSystem === "rate_limiter") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="180" y="80" width="580" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="200" y="110" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">VPC Rate Limiter Region</text>

            <!-- Connections -->
            <path d="M120 250 L 200 250" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 220 L 420 170" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 280 L 420 330" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M270 300 L 270 350" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M340 250 L 680 250" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M120 250 L 200 250" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 220 L 420 170" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 280 L 420 330" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M270 300 L 270 350" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M340 250 L 680 250" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: CloudFront/WAF -->
            <g class="interactive-node" id="ingress" transform="translate(40, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="11" fill="#ff9800" font-weight="700" text-anchor="middle">CloudFront</text>
                <text x="40" y="58" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">WAF Edge</text>
            </g>

            <!-- Envoy Sidecar Proxy -->
            <g class="interactive-node" id="proxy" transform="translate(200, 200)">
                <rect x="0" y="0" width="140" height="100" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="40" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">Envoy Sidecar</text>
                <text x="70" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Rate Evaluator</text>
            </g>

            <!-- ElastiCache Redis -->
            <g class="interactive-node" id="redis" transform="translate(420, 120)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#3b82f6" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Atomic Lua Scripts</text>
            </g>

            <!-- Aurora PostgreSQL Rules DB -->
            <g class="interactive-node" id="db" transform="translate(420, 280)">
                <rect x="0" y="0" width="180" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="90" y="40" font-family="Outfit" font-size="13" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="90" y="65" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Rate Limit Rules</text>
            </g>

            <!-- MSK Kafka Audit -->
            <g class="interactive-node" id="s3" transform="translate(200, 350)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#ef5350" stroke-width="1.5" />
                <text x="70" y="30" font-family="Outfit" font-size="11" fill="#ef5350" font-weight="700" text-anchor="middle">MSK Kafka Audit</text>
            </g>

            <!-- Backend Services -->
            <g class="interactive-node" id="target" transform="translate(680, 210)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="40" y="40" font-family="Outfit" font-size="11" fill="#10b981" font-weight="700" text-anchor="middle">Backend</text>
                <text x="40" y="58" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Services</text>
            </g>
        </svg>`;
    } else if (currentSystem === "spell_checker") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="170" y="70" width="590" height="350" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="190" y="98" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">ECS Fargate — Spell Check Service Cluster</text>

            <!-- Connections (static) -->
            <path d="M110 220 L190 220" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M330 220 L420 155" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M330 240 L420 300" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M330 220 L620 220" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M265 290 L265 355" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M560 155 L620 220" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M560 300 L620 240" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M110 220 L190 220" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M330 220 L420 155" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M330 240 L420 300" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M265 290 L265 355" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M560 155 L620 220" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M560 300 L620 240" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: CloudFront + WAF -->
            <g class="interactive-node" id="ingress" transform="translate(30, 180)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="36" font-family="Outfit" font-size="10" fill="#ff9800" font-weight="700" text-anchor="middle">CloudFront</text>
                <text x="40" y="52" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">+ WAF</text>
                <text x="40" y="68" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Edge Cache</text>
            </g>

            <!-- Spell Check Service (ECS Fargate) — main pipeline box -->
            <g class="interactive-node" id="proxy" transform="translate(190, 130)">
                <rect x="0" y="0" width="140" height="180" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="28" font-family="Outfit" font-size="11" fill="#3b82f6" font-weight="700" text-anchor="middle">Spell Pipeline</text>
                <text x="70" y="50" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">🌸 Bloom Filter</text>
                <text x="70" y="68" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">🌳 BK-Tree Engine</text>
                <text x="70" y="86" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">📊 KenLM 5-gram</text>
                <text x="70" y="104" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">🤖 BERT Ranker</text>
                <rect x="10" y="118" width="120" height="52" rx="6" fill="#1e3a5f" stroke="#3b82f6" stroke-width="1" />
                <text x="70" y="140" font-family="Outfit" font-size="9" fill="#60a5fa" text-anchor="middle">ECS Fargate</text>
                <text x="70" y="155" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">2vCPU / 4GB</text>
                <text x="70" y="168" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Min 10 / Max 200</text>
            </g>

            <!-- Redis Suggestion Cache -->
            <g class="interactive-node" id="redis" transform="translate(420, 110)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="70" y="30" font-family="Outfit" font-size="12" fill="#3b82f6" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="70" y="50" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">Suggestion Cache</text>
                <text x="70" y="66" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">6 shards · 10 GB</text>
            </g>

            <!-- Aurora PostgreSQL -->
            <g class="interactive-node" id="db" transform="translate(420, 260)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="30" font-family="Outfit" font-size="12" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="70" y="50" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">User Dictionaries</text>
                <text x="70" y="66" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Global DB · Multi-AZ</text>
            </g>

            <!-- MSK Kafka Feedback -->
            <g class="interactive-node" id="sagemaker" transform="translate(190, 355)">
                <rect x="0" y="0" width="140" height="50" rx="8" fill="#111827" stroke="#ef5350" stroke-width="1.5" />
                <text x="70" y="22" font-family="Outfit" font-size="10" fill="#ef5350" font-weight="700" text-anchor="middle">MSK Kafka + SageMaker</text>
                <text x="70" y="38" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Feedback → BERT Training</text>
            </g>

            <!-- Backend / Response -->
            <g class="interactive-node" id="target" transform="translate(620, 180)">
                <rect x="0" y="0" width="100" height="90" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="50" y="36" font-family="Outfit" font-size="11" fill="#10b981" font-weight="700" text-anchor="middle">Ranked</text>
                <text x="50" y="54" font-family="Outfit" font-size="11" fill="#10b981" font-weight="700" text-anchor="middle">Suggestions</text>
                <text x="50" y="72" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">≤ 50ms P99</text>
            </g>
        </svg>`;
    } else if (currentSystem === "search_ranking") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- VPC Box -->
            <rect x="160" y="60" width="610" height="360" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="180" y="88" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">Multi-Stage Search Ranking Engine Pipeline</text>

            <!-- Connections (static) -->
            <path d="M100 230 L180 230" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M330 230 L420 150" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M330 230 L420 310" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M570 150 L640 230" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M570 310 L640 230" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Neon Flow Lines -->
            <path class="data-flow-line" d="M100 230 L180 230" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M330 230 L420 150" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M330 230 L420 310" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M570 150 L640 230" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M570 310 L640 230" stroke="#ab47bc" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Ingress: API Gateway -->
            <g class="interactive-node" id="ingress" transform="translate(20, 185)">
                <rect x="0" y="0" width="80" height="90" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="36" font-family="Outfit" font-size="10" fill="#ff9800" font-weight="700" text-anchor="middle">API Gateway</text>
                <text x="40" y="52" font-family="Outfit" font-size="10" fill="#f3f4f6" text-anchor="middle">+ CloudFront</text>
                <text x="40" y="70" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">100k+ QPS</text>
            </g>

            <!-- ECS Search Orchestrator -->
            <g class="interactive-node" id="proxy" transform="translate(180, 130)">
                <rect x="0" y="0" width="150" height="200" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="75" y="28" font-family="Outfit" font-size="11" fill="#3b82f6" font-weight="700" text-anchor="middle">Ranker Orchestrator</text>
                <text x="75" y="50" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">🔍 L1: Recall (1000)</text>
                <text x="75" y="70" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">⚡ L2: Pre-Rank (100)</text>
                <text x="75" y="90" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">🧠 L3: Deep Rank (50)</text>
                <text x="75" y="110" font-family="Outfit" font-size="9" fill="#9ca3af" text-anchor="middle">🎯 L4: MMR Diversity (20)</text>
                <rect x="15" y="125" width="120" height="60" rx="6" fill="#1e3a5f" stroke="#3b82f6" stroke-width="1" />
                <text x="75" y="145" font-family="Outfit" font-size="9" fill="#60a5fa" text-anchor="middle">ECS Fargate</text>
                <text x="75" y="160" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Sub-50ms P99</text>
                <text x="75" y="175" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Fallback Hierarchy</text>
            </g>

            <!-- OpenSearch L1 Hybrid Index -->
            <g class="interactive-node" id="db" transform="translate(420, 105)">
                <rect x="0" y="0" width="150" height="90" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="75" y="30" font-family="Outfit" font-size="11" fill="#10b981" font-weight="700" text-anchor="middle">Amazon OpenSearch</text>
                <text x="75" y="48" font-family="Outfit" font-size="9" fill="#f3f4f6" text-anchor="middle">BM25 + Vector KNN</text>
                <text x="75" y="64" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Reciprocal Rank Fusion</text>
                <text x="75" y="78" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">10B Items Catalog</text>
            </g>

            <!-- Feature Store: Redis + DynamoDB -->
            <g class="interactive-node" id="redis" transform="translate(420, 265)">
                <rect x="0" y="0" width="150" height="90" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="75" y="30" font-family="Outfit" font-size="11" fill="#ab47bc" font-weight="700" text-anchor="middle">Redis &amp; DynamoDB</text>
                <text x="75" y="48" font-family="Outfit" font-size="9" fill="#f3f4f6" text-anchor="middle">Dual Feature Store</text>
                <text x="75" y="64" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">User Profiles (&lt;2ms)</text>
                <text x="75" y="78" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">10B Item Metadata</text>
            </g>

            <!-- SageMaker L3 Model Endpoint -->
            <g class="interactive-node" id="sagemaker" transform="translate(640, 185)">
                <rect x="0" y="0" width="115" height="90" rx="10" fill="#111827" stroke="#38bdf8" stroke-width="2" />
                <text x="57" y="30" font-family="Outfit" font-size="11" fill="#38bdf8" font-weight="700" text-anchor="middle">SageMaker L3</text>
                <text x="57" y="48" font-family="Outfit" font-size="9" fill="#f3f4f6" text-anchor="middle">Deep Neural Ranker</text>
                <text x="57" y="64" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Two-Tower &amp; X-Enc</text>
                <text x="57" y="78" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">pCTR / pCVR MTL</text>
            </g>
        </svg>`;
    } else if (currentSystem === "circuit_breaker") {
        svgContent = `
        <svg viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
            <!-- Background cluster box -->
            <rect x="170" y="60" width="470" height="340" rx="15" fill="#1f2937" stroke="#4b5563" stroke-width="2" />
            <text x="192" y="90" font-family="Outfit" font-size="12" fill="#9ca3af" font-weight="600">Circuit Breaker Sidecar — 3-State FSM Engine</text>

            <!-- Static connection lines -->
            <path d="M100 230 L185 230" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M345 155 L415 155" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M345 230 L415 230" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M345 305 L415 305" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M555 155 L640 185" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M555 230 L640 220" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M555 305 L640 265" stroke="#4b5563" stroke-width="2" fill="none" />
            <path d="M260 340 L260 385" stroke="#4b5563" stroke-width="2" fill="none" />

            <!-- Animated flow lines -->
            <path class="data-flow-line" d="M100 230 L185 230" stroke="#ff9800" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M345 155 L415 155" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M345 305 L415 305" stroke="#3b82f6" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M260 340 L260 385" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M555 155 L640 185" stroke="#10b981" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />
            <path class="data-flow-line" d="M555 305 L640 265" stroke="#ef5350" fill="none" style="display: ${simulationActive ? 'block' : 'none'};" />

            <!-- Caller microservices (ingress) -->
            <g class="interactive-node" id="ingress" transform="translate(20, 190)">
                <rect x="0" y="0" width="80" height="80" rx="10" fill="#111827" stroke="#ff9800" stroke-width="2" />
                <text x="40" y="30" font-family="Outfit" font-size="10" fill="#ff9800" font-weight="700" text-anchor="middle">Caller</text>
                <text x="40" y="48" font-family="Outfit" font-size="9" fill="#f3f4f6" text-anchor="middle">Microservice</text>
                <text x="40" y="64" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">Envoy Sidecar</text>
            </g>

            <!-- FSM — CLOSED state -->
            <g class="interactive-node" id="proxy" transform="translate(186, 115)">
                <rect x="0" y="0" width="158" height="240" rx="10" fill="#111827" stroke="#3b82f6" stroke-width="2" />
                <text x="79" y="26" font-family="Outfit" font-size="11" fill="#3b82f6" font-weight="700" text-anchor="middle">3-State FSM</text>

                <!-- CLOSED -->
                <rect x="10" y="38" width="138" height="46" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1.5" />
                <text x="79" y="57" font-family="Outfit" font-size="10" fill="#10b981" font-weight="700" text-anchor="middle">🟢 CLOSED</text>
                <text x="79" y="73" font-family="Outfit" font-size="8" fill="#6b7280" text-anchor="middle">All requests pass through</text>

                <!-- OPEN -->
                <rect x="10" y="94" width="138" height="46" rx="6" fill="#450a0a" stroke="#ef4444" stroke-width="1.5" />
                <text x="79" y="113" font-family="Outfit" font-size="10" fill="#ef4444" font-weight="700" text-anchor="middle">🔴 OPEN</text>
                <text x="79" y="129" font-family="Outfit" font-size="8" fill="#6b7280" text-anchor="middle">Fail-fast, no upstream calls</text>

                <!-- HALF-OPEN -->
                <rect x="10" y="150" width="138" height="46" rx="6" fill="#451a03" stroke="#f59e0b" stroke-width="1.5" />
                <text x="79" y="169" font-family="Outfit" font-size="10" fill="#f59e0b" font-weight="700" text-anchor="middle">🟡 HALF-OPEN</text>
                <text x="79" y="185" font-family="Outfit" font-size="8" fill="#6b7280" text-anchor="middle">Probe requests only</text>

                <!-- Sliding window -->
                <rect x="10" y="206" width="138" height="26" rx="4" fill="#1e3a5f" stroke="#3b82f6" stroke-width="1" />
                <text x="79" y="222" font-family="Outfit" font-size="8" fill="#60a5fa" text-anchor="middle">Sliding Window · Bulkhead</text>
            </g>

            <!-- Redis State Store -->
            <g class="interactive-node" id="redis" transform="translate(415, 115)">
                <rect x="0" y="0" width="140" height="80" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="70" y="28" font-family="Outfit" font-size="11" fill="#10b981" font-weight="700" text-anchor="middle">ElastiCache Redis</text>
                <text x="70" y="46" font-family="Outfit" font-size="9" fill="#f3f4f6" text-anchor="middle">Circuit State Store</text>
                <text x="70" y="62" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">6 shards · Pub/Sub</text>
                <text x="70" y="76" font-family="Outfit" font-size="8" fill="#6b7280" text-anchor="middle">&lt; 1ms state read</text>
            </g>

            <!-- Aurora Config DB -->
            <g class="interactive-node" id="db" transform="translate(415, 265)">
                <rect x="0" y="0" width="140" height="70" rx="10" fill="#111827" stroke="#ab47bc" stroke-width="2" />
                <text x="70" y="26" font-family="Outfit" font-size="11" fill="#ab47bc" font-weight="700" text-anchor="middle">Aurora PostgreSQL</text>
                <text x="70" y="44" font-family="Outfit" font-size="9" fill="#f3f4f6" text-anchor="middle">Config + Audit Log</text>
                <text x="70" y="60" font-family="Outfit" font-size="8" fill="#6b7280" text-anchor="middle">Global DB · Multi-AZ</text>
            </g>

            <!-- Observability -->
            <g class="interactive-node" id="sagemaker" transform="translate(186, 385)">
                <rect x="0" y="0" width="158" height="50" rx="8" fill="#111827" stroke="#ef5350" stroke-width="1.5" />
                <text x="79" y="22" font-family="Outfit" font-size="10" fill="#ef5350" font-weight="700" text-anchor="middle">MSK Kafka + CloudWatch</text>
                <text x="79" y="38" font-family="Outfit" font-size="9" fill="#6b7280" text-anchor="middle">State Transition Events</text>
            </g>

            <!-- Upstream / Fallback -->
            <g class="interactive-node" id="target" transform="translate(640, 155)">
                <rect x="0" y="0" width="125" height="145" rx="10" fill="#111827" stroke="#10b981" stroke-width="2" />
                <text x="62" y="24" font-family="Outfit" font-size="10" fill="#10b981" font-weight="700" text-anchor="middle">Upstream Svc</text>
                <rect x="8" y="34" width="109" height="36" rx="5" fill="#064e3b" stroke="#10b981" stroke-width="1" />
                <text x="62" y="55" font-family="Outfit" font-size="9" fill="#10b981" text-anchor="middle">✅ CLOSED path</text>
                <rect x="8" y="78" width="109" height="57" rx="5" fill="#450a0a" stroke="#ef4444" stroke-width="1" />
                <text x="62" y="98" font-family="Outfit" font-size="9" fill="#ef4444" text-anchor="middle">🔴 OPEN fallback:</text>
                <text x="62" y="113" font-family="Outfit" font-size="8" fill="#6b7280" text-anchor="middle">Cache / Stub / 503</text>
                <text x="62" y="128" font-family="Outfit" font-size="8" fill="#6b7280" text-anchor="middle">Retry-After header</text>
            </g>
        </svg>`;
    }

    // Inject premium dark grid background and neon glow filters dynamically
    const gridAndFilters = `
        <defs>
            <pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.025)" stroke-width="1" />
            </pattern>
            <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <!-- Background grid block -->
        <rect width="100%" height="100%" fill="url(#blueprint-grid)" rx="15" />
    `;
    svgContent = svgContent.replace(/<svg ([^>]+)>/, `<svg $1>${gridAndFilters}`);
    return svgContent;
}
