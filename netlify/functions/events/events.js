const fetch = require('node-fetch')

// fb webhook verification
// See https://developers.facebook.com/docs/graph-api/webhooks/getting-started
// See https://developers.facebook.com/docs/graph-api/webhooks/reference/page/
// Endpoint: https://connect.treeoflight.earth/.netlify/functions/events-background
// Local Tests: https://treeoflight-3e2495.netlify.live/.netlify/functions/events

const handler = async function (event, context, callback) {
  const { 
    headers,
    httpMethod, 
    isBase64Encoded,
    rawUrl,
    rawQuery,
  } = event;
  // GET requests
  if (httpMethod === "GET") {
    let message = "No hub was identified";
    const { queryStringParameters, multiValueQueryStringParameters } = event;
    console.log("queryStringParameters", queryStringParameters);
    console.log("multiValueQueryStringParameters[0]", multiValueQueryStringParameters);
    const mode = queryStringParameters['hub.mode'];
    const challenge = queryStringParameters['hub.challenge'];
    const verify_token = queryStringParameters['hub.verify_token'];
    console.log("mode", mode);
    console.log("challenge", challenge);
    console.log("verify_token", verify_token);
    if (mode === "subscribe" && challenge) {
      const token = verify_token === process.env.FACEBOOK_EVENTS_WEBHOOK_TOKEN;
      message = "Your token did not match";
      if (token) {
        message = "Your token matched";
        console.log(200, message);
        return {
          statusCode: 200,
          // Could be a custom message or object i.e. JSON.stringify(err)
          body: challenge,
        }
      }
      console.log(500, message);
      return {
        statusCode: 500,
        // Could be a custom message or object i.e. JSON.stringify(err)
        body: JSON.stringify({ mode, challenge, error: message }),
      }
    }
    console.log(501, message);
    return {
      statusCode: 501,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ error: message }),
    }
  } else if (httpMethod === "POST") {
    let message = "No agent was identified"
    const { body } = event
    const agent = headers['user-agent']
    // console.log("agent", agent)
    if (agent === "Webhooks/1.0 (https://fb.me/webhooks)") {
      message = "Feed update received..."
      const payload = JSON.parse(body)
      const { entry, object } = payload
      const { id, time, changes } = entry[0]
      const { field, value } = changes[0]
      const { from, post=true, link, photo, item, published, is_hidden, edited_time } = value

      if (post) {
        const endpointUrl = process.env.ZAPIER_WEBHOOK_URL || "https://hooks.zapier.com/hooks/catch/12597535/bpqns9a/";
        console.log("Post received and being sent...")
        // const { status_type, is_published, permalink_url, updated_time, id: postId } = post
        // const { name, id: fromId } = from
        // status_type === "created_event"
        const payload = {
          _meta: {
            id,
            time,
            object,
            field,
            from
          },
          update: value,
          channel: "facebook",
          isBase64Encoded,
          rawUrl,
          rawQuery,
          headers,
        }
        try {
          const response = await fetch(endpointUrl, {
            headers: { Accept: 'application/json' },
            method: 'post',
	          body: JSON.stringify(payload),
          })
          if (!response.ok) {
            // NOT res.status >= 200 && res.status < 300
            return { statusCode: response.status, body: response.statusText }
          }
          const data = await response.json()
      
          return {
            statusCode: 200,
            body: JSON.stringify({ msg: data }),
          }
        } catch (error) {
          // output to netlify function log
          console.log(error)
          return {
            statusCode: 500,
            // Could be a custom message or object i.e. JSON.stringify(err)
            body: JSON.stringify({ msg: error.message }),
          }
        }
      }
    }
    message = "No post identified..."
    console.log(200, message)
    return {
      statusCode: 200,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ error: message }),
      
    }
  }
  // console.log("event", event)
}

module.exports = { handler }
