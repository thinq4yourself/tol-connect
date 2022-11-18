const Analytics = require('analytics-node');
const axios = require('axios');
const Sentry = require("@sentry/node");
// Importing @sentry/tracing patches the global hub for tracing to work.
const SentryTracing = require("@sentry/tracing");

Sentry.init({
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  dsn: process.env.GATSBY_SENTRY_DSN,
  environment: process.env.GATSBY_ACTIVE_ENV,
  sampleRate: process.env.GATSBY_SENTRY_TRACE_SAMPLE_RATE,
  tracesSampleRate: process.env.GATSBY_SENTRY_TRACE_SAMPLE_RATE,
  maxBreadcrumbs: process.env.GATSBY_SENTRY_BREADCRUMBS,
  attachStacktrace: process.env.GATSBY_SENTRY_STACKTRACE,
  autoSessionTracking: process.env.GATSBY_SENTRY_SESSION_TRACKING,
  serverName: process.env.SENTRY_SERVERNAME,
  url: `${process.env.DEPLOY_PRIME_URL}/.netlify/functions/zapier-subscribe-update`,
});

const handler = async function (event, context, callback) {
  console.log("Getting started...");
  const segmentId = process.env.GATSBY_ANALYTICS_ENV === 'development' ? process.env.NETLIFY_SEGMENT_DEV_ID : process.env.NETLIFY_SEGMENT_ID;
  const analytics = new Analytics(segmentId, { flushAt: 1 });
  const serverSideTrack = process.env.NETLIFY_SEGMENT_TRACKING === "true" || process.env.NETLIFY_SEGMENT_TRACKING === "on";
  const zapierBaseUrl = process.env.ZAPIER_MODE === 'test' ? process.env.ZAPIER_DEV_WEBHOOK_URL : process.env.ZAPIER_WEBHOOK_URL;
  // const baseAppUrl = process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL || process.env.URL || process.env.GATSBY_SITE_URL;
  // const mailchimpHandler = '/.netlify/functions/mailchimp-subscribe-update';
  const zapierMode =
      process.env.ZAPIER_MODE === "on" ||
      process.env.ZAPIER_MODE === "test";
  // const useMailchimpBackup = process.env.ZAPIER_MAILCHIMP_BACKUP || null;

  function handleError(callback, error) {
    console.log("handleError...");
    const { message, response, code } = error;
    const statCode = code || 500;
    const errorMsg = {
      message: message || "Oops, a zap error occurred.",
      status: statCode,
      statusCode: statCode,
      error: response,
    };
    console.log("errorMessage...", errorMsg);
    Sentry.captureException(error);
    return {
      statusCode: errorMsg.statusCode,
      body: JSON.stringify(errorMsg),
      error: JSON.stringify(errorMsg),
      errorObject: error,
    };
  };

  function handleSuccess(callback, results) {
    console.log("handleSuccess...");
    const { status, statusText, data } = results;
    const statCode = status || 200;
    const returnMessage = data.status === "success" ? "Successfully subscribed." : data.status;
    const successMessage = {
      message: returnMessage || "Successfully subscribed.",
      status: statCode,
      statusCode: statCode,
      statusText: statusText,
    };
    console.log("successMessage...", successMessage);
    return {
      statusCode: statCode,
      body: JSON.stringify(successMessage),
    };
  };

  const { form, lead, track, anonymousId } = JSON.parse(event.body);
  const name = form && form.name || lead && lead.name;
  const nameArray = name.split(/(\s+)/);
  const firstName = lead.firstName || nameArray[0];
  const lastName = lead.firstName || nameArray[1];
  const trackToSegment = track || serverSideTrack;
  // Segment - Track the Lead for Intercom CRM, Auth0, etc
  if (trackToSegment) {
    console.log("Server side tracking...");
    if (lead?.user_id) {
      console.log("Identify user...", lead?.user_id);
      analytics.identify({ userId: lead?.user_id, anonymousId, traits: lead });
      analytics.flushed = false;
      analytics.track({ userId: lead?.user_id, event: `${lead?.source || "Website signup"} netlify`, properties: lead });
    } else {
      console.log("Identified anonymous user...", anonymousId);
      analytics.identify({ anonymousId, traits: lead });
      analytics.flushed = false;
      analytics.track({ anonymousId: anonymousId, event: `${lead?.source || "Website signup"} netlify`, properties: lead });
    }
    analytics.flush(function(err, batch){
      console.log("Tracked...");
    });    
    // handleSuccess(callback, {});
  };

  // const AuthorizationHeader = `Bearer ${accessToken}`;
  if (zapierMode) {
    const isOnWaitlist = lead.waitlist || form.waitlist || lead.company.company_waitlist || form.userType?.value === "Homeowner";
    const updatedStatus = isOnWaitlist ? 'waitlist' : 'subscribed';
    // define the zapier api payload
    const data = {
      userId: lead?.user_id,
      anonymousId,
      firstName,
      lastName,
      lead,
      form,
      status: updatedStatus,
      withAuth: false
    };
    console.log("Going to send to zapier now...");
    return axios.post(zapierBaseUrl, data)
      .then(results => {
        console.log(`Zapped the lead to zapier`);
        return handleSuccess(callback, results);
      }).catch(error => {
        console.log("All done trying, handling error...");
        return handleError(callback, error);
      });
  } else {
    const error = {
      detail: "Nothing configured to work here..."
    };
    return handleError(callback, error);
  };
};

exports.handler = handler;

/*
if (useMailchimpBackup) {
        console.log("That didn't work (again), trying to send user to mailchimp handler...");
          const body = {
            form,
            lead,
            track,
            anonymousId,
          }
          return fetch(mailchimpHandler, {
            method: 'post',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json'}
          });
      }
    */