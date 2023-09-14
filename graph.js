async function queryGraphQL(query, variables) {
    const jwtToken = getCookie('jwt'); 
    const headers = {
        "Authorization": "Bearer " + jwtToken,
        "Content-Type": "application/json"
    };
    
    const requestOptions = {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            query: query,
            variables: variables
        })
    };
    
    try {
        const response = await fetch('https://01.kood.tech/api/graphql-engine/v1/graphql', requestOptions);
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const result = await response.json();
        return result;
    } catch (error) {
        return null;
    }
}

async function fetchUserProfile() {
    const query = `
        {
            user {
                login
                lastName
                firstName
                auditRatio
                email
                totalUp
                totalDown
            }
        }
    `;

    try {
        const responseData = await queryGraphQL(query, {});

        if (responseData && responseData.data && responseData.data.user && responseData.data.user.length > 0) {
            const userData = responseData.data.user[0];

             document.getElementById("username").textContent = userData.login;
             document.getElementById("full-name").textContent = userData.firstName + " " + userData.lastName;
             document.getElementById("user-email").textContent = userData.email;
             document.getElementById("audit-ratio").textContent = Math.round(userData.auditRatio * 1000) / 1000;
             document.getElementById("xp-done").textContent = convertToKbOrMB(userData.totalUp);
             document.getElementById("xp-received").textContent = convertToKbOrMB(userData.totalDown);
             fetchAndCreateBarGraph();
             createDonutChart(userData.totalUp, userData.totalDown);
            } else {
             console.warn('No user data found.');
         }
     } catch (error) {
         console.error('Fetch user profile error:', error);
     }
     
}

function createDonutChart(xpDone, xpReceived) {
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2;

    const data = [
        { label: `XP Done ${convertToKbOrMB(xpDone)}`, value: xpDone },
        { label: `XP Received ${convertToKbOrMB(xpReceived)}`, value: xpReceived },
    ];

    const color = d3.scaleOrdinal(["#FF5733", "#FFC300"]);

    const svg = d3
        .select("#donut-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const arc = d3.arc().innerRadius(radius - 100).outerRadius(radius);

    const pie = d3.pie().value(d => d.value);

    const arcs = svg
        .selectAll("arc")
        .data(pie(data))
        .enter()
        .append("g")
        .attr("class", "arc");

    arcs
        .append("path")
        .attr("d", arc)
        .attr("fill", (d, i) => color(i)); 

    arcs
        .append("text")
        .attr("transform", d => `translate(${arc.centroid(d)}) rotate(-45)`) // Rotate text by -45 degrees
        .attr("text-anchor", "middle")
        .text(d => d.data.label);

    svg.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("text-anchor", "middle")
        .style("font-size", "16px")
        .text("XP Summary");
}



async function fetchAndCreateBarGraph() {
    const query = `
        query ($type: String) {
            transaction(
                where: {
                    path: {_regex: "^\\/johvi\\/div-01\\/[-\\\\w]+$"}
                    type: {_eq:$type}
                },
                order_by: {amount: desc_nulls_last},
            ) {
                amount
                path
            }
        }`;

    try {
        const responseData = await queryGraphQL(query, { type: "xp" });

        if (responseData && responseData.data && responseData.data.transaction && responseData.data.transaction.length > 0) {
            // Remove "/johvi/div-01/" from the path field
            const transactionData = responseData.data.transaction.map(item => ({
                ...item,
                path: item.path.replace("/johvi/div-01/", ""), 
                amountKB: item.amount / 1024
            }));

            transactionData.sort((a, b) => b.amount - a.amount);

            const margin = { top: 50, right: 20, bottom: 70, left: 120 }; 
            const width = 800 - margin.left - margin.right;
            const height = 400 - margin.top - margin.bottom;

            const svg = d3.select("#bar-chart")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("text")
                .attr("class", "graph-title")
                .attr("x", width / 2)
                .attr("y", -20) 
                .style("text-anchor", "middle")
                .style("font-size", "18px") 
                .text("XP earned by project"); 

            const xScale = d3.scaleBand()
                .domain(transactionData.map(d => d.path)) 
                .range([0, width])
                .padding(0.1);

            const yScale = d3.scaleLinear() 
                .domain([0, d3.max(transactionData, d => d.amountKB)]) 
                .range([height, 0]);

            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-45)");

            svg.selectAll(".tick text")
                .style("font-size", "12px")
                .style("fill", "gray");

            svg.append("g")
                .attr("class", "y-axis")
                .call(yAxis)
                .selectAll("text")
                .style("font-size", "12px")
                .style("fill", "gray");

            svg.selectAll(".bar")
                .data(transactionData)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", d => xScale(d.path)) 
                .attr("y", d => yScale(d.amountKB)) 
                .attr("width", d => xScale.bandwidth()) 
                .attr("height", d => height - yScale(d.amountKB)) 
                .attr("fill", "rgba(60, 179, 113, 1)"); 

            svg.append("text")
                .attr("class", "y-axis-label")
                .attr("transform", "rotate(-90)")
                .attr("y", -80)
                .attr("x", -height / 2)
                .attr("dy", "1em")
                .style("text-anchor", "middle")
                .text("Amount (KB)");

        } else {
            console.warn("No data found for the bar graph.");
        }
    } catch (error) {
        console.error("Fetch and create bar graph error:", error);
    }
}

function convertToKbOrMB(value) {
    if (value < 1000000) {
        return Math.round(value / 1000 * 100) / 100 + " KB";
    } else if (value >= 1000000) {
        return Math.round(value / 1000000 * 100) / 100 + " MB";
    } else {
        return value;
    }
}