#!/usr/bin/env node

const http = require('http');
const url = require('url');

// Simulate Claude AI responses based on different scenarios
const claudeResponses = {
  analyze_contact: {
    response: `🎯 **Contact Analysis: John Smith (CEO, TechCorp)**

**📊 Profile Assessment:**
- **Decision Maker Level:** ✅ High (CEO position)
- **Engagement Status:** 🟡 Warm (recent interest expressed)
- **Pain Point:** ⏰ Implementation timeline concerns
- **Opportunity Size:** 🏢 Enterprise-level potential

**🚀 Recommended Follow-up Strategy:**

1. **Immediate Actions (Next 48 Hours):**
   - Send implementation timeline case study showing 30-day rapid deployment
   - Schedule demo focused on quick-start enterprise features
   - Introduce Customer Success Manager for implementation planning

2. **Value Proposition Focus:**
   - Emphasize accelerated ROI with fast implementation
   - Share similar enterprise client success stories
   - Propose pilot program to reduce perceived risk

3. **Next Meeting Agenda:**
   - Technical implementation deep-dive
   - Resource allocation planning
   - Success metrics definition

**🎯 Conversion Probability:** 75% (High intent + decision maker authority)
**⏱️ Recommended Timeline:** Follow up within 2 business days

*Analysis complete - forwarding to #sales channel*`,
    metadata: {
      priority: "High",
      nextAction: "Schedule demo call",
      timeline: "2 business days"
    }
  },

  analyze_deals: {
    response: `📈 **Deal Pipeline Analysis - Q4 Performance**

**🏆 Top Performing Deals:**
1. **MegaCorp Solution** - $150K
   - Stage: Proposal Review
   - Probability: 85%
   - 🚨 Action: Follow up on contract terms

2. **StartupXYZ Platform** - $45K
   - Stage: Technical Evaluation
   - Probability: 70%
   - 💡 Insight: Need security compliance docs

3. **Enterprise Inc Integration** - $200K
   - Stage: Negotiation
   - Probability: 60%
   - ⚠️ Risk: Budget approval pending

**📊 Pipeline Health Metrics:**
- Total Pipeline Value: $875K
- Weighted Pipeline: $520K
- Average Deal Size: $87K
- Conversion Rate: 32% (Above target!)

**🎯 Recommended Actions:**
1. Prioritize MegaCorp closing activities
2. Expedite security docs for StartupXYZ
3. Schedule budget discussion with Enterprise Inc
4. Focus on deals >$75K for maximum impact

**🚀 Forecast:** $415K likely to close this quarter`,
    metadata: {
      totalValue: "$875K",
      weightedValue: "$520K",
      conversionRate: "32%"
    }
  },

  lead_scoring: {
    response: `🎯 **AI-Powered Lead Scoring Analysis**

**📋 Lead: Sarah Johnson (CTO, InnovateTech)**

**🔢 AI Scoring Breakdown:**
- **Demographic Score:** 85/100
  - C-level title: +30 points
  - Tech industry: +25 points
  - Company size (500+ employees): +30 points

- **Behavioral Score:** 78/100
  - Downloaded 3 whitepapers: +25 points
  - Attended webinar: +20 points
  - Visited pricing page 4 times: +33 points

- **Engagement Score:** 92/100
  - Email open rate: 90% (+30 points)
  - Click-through rate: 45% (+35 points)
  - Social media engagement: +27 points

**🏆 Overall Score: 85/100 (A-Grade Lead)**

**🚀 Recommended Actions:**
1. **Immediate:** Assign to senior sales rep
2. **Priority:** Schedule executive briefing
3. **Timeline:** Contact within 24 hours
4. **Approach:** Technical solution-focused pitch

**💡 Key Insights:**
- High technical interest (multiple whitepaper downloads)
- Budget research phase (pricing page visits)
- Ready for direct sales engagement

*Lead automatically promoted to hot prospects list* ✨`,
    metadata: {
      score: "85/100",
      grade: "A",
      priority: "High"
    }
  }
};

// Create HTTP server to simulate the webhook endpoint
const server = http.createServer((req, res) => {
  if (req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('\n🚀 Claude AI Assistant Request Received:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📋 Query: ${data.query}`);
        console.log(`🎯 Action: ${data.action || 'general_analysis'}`);
        console.log(`📍 Context: ${data.context || 'No additional context'}`);
        console.log('');

        // Simulate Claude AI processing
        console.log('🧠 Claude AI Processing...');
        console.log('   ▸ Analyzing request context');
        console.log('   ▸ Accessing HubSpot data');
        console.log('   ▸ Generating insights');
        console.log('   ▸ Formatting response');
        console.log('');

        // Get appropriate response based on action
        const responseKey = data.action || 'analyze_contact';
        const aiResponse = claudeResponses[responseKey] || claudeResponses.analyze_contact;

        console.log('✨ Claude AI Response Generated:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(aiResponse.response);
        console.log('');

        // Simulate Slack notification
        if (data.slackChannel) {
          console.log(`📱 Sending to Slack channel: ${data.slackChannel}`);
          console.log('✅ Slack notification sent successfully');
          console.log('');
        }

        // Send response
        const response = {
          status: 'success',
          message: 'Claude analysis completed',
          response: aiResponse.response,
          metadata: aiResponse.metadata,
          timestamp: new Date().toISOString(),
          processingTime: '2.3s'
        };

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify(response, null, 2));

      } catch (error) {
        console.error('❌ Error processing request:', error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Claude AI Assistant Demo - POST requests only');
  }
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log('\n🎯 Claude AI Assistant Demo Server Started');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log('🤖 Ready to demonstrate Claude AI capabilities');
  console.log('');
  console.log('📋 Available demo scenarios:');
  console.log('   • Contact Analysis (action: analyze_contact)');
  console.log('   • Deal Pipeline Analysis (action: analyze_deals)');
  console.log('   • Lead Scoring (action: lead_scoring)');
  console.log('');
  console.log('💡 Try the demo commands that will be shown next...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Claude AI Assistant demo...');
  server.close(() => {
    console.log('✅ Demo server stopped');
    process.exit(0);
  });
});