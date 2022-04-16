import 'dotenv/config';
import fetch from 'node-fetch';
import { AuthenticationClient, ManagementClient } from 'auth0';

const {
  AUTH0_ISSUER_BASE_URL,
  AUTH0_ISSUER_DOMAIN,
  AUTH0_CLIENT_ID,
  BASE_URL,
  SESSION_SECRET,
  AUTH0_AUDIENCE,
  CLIENT_SECRET
} = process.env;

enum UserRole {
  ADMIN = 'rol_CATA1WsgGx6zcnMF',
  AGENT = 'rol_2Br5G4IDGMO3xLoh',
  CLIENT = 'rol_fY4Y6mp0CG3Td54C',
  CONTROLLER = 'rol_uhe7mVY2EDCVXEqg'
}

const getToken = async (): Promise<string> => {
  if (AUTH0_ISSUER_BASE_URL && AUTH0_CLIENT_ID && CLIENT_SECRET) {
    // GENERATE MGMT TOKEN:
    const url = `${AUTH0_ISSUER_BASE_URL}oauth/token`;
    const options = {
      // url,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'MknzIPbTQLtbEF3UmpjnDFpxrgV0JQHE',
        client_secret: 'EmrXa1F_wxItmXlUSyyvui5gsjKiRNnARifovsz36PP6Lm7OrxaL21cNZRtXamtJ',
        audience: `${AUTH0_ISSUER_BASE_URL}api/v2/`
      })
    };

    // console.log('Generate auth0token', url, options);

    const res = await fetch(url, options);
    const data = await res.json();

    if (data && data.access_token) {
      // console.log(data);
      return data.access_token;
    } else {
      throw new Error('Unable to get token!');
    }

    // fetch(url, options).then((res) => res.json())
    //   .then(function (data) {
    //     console.log(data);
    //   })
    //   .catch(function (error) {
    //     console.error(error);
    //   });
  } else {
    throw new Error('Bad env');
  }
};

// if (AUTH0_ISSUER_BASE_URL && AUTH0_CLIENT_ID && CLIENT_SECRET) {
//   // GENERATE MGMT TOKEN:
//   const url = `${AUTH0_ISSUER_BASE_URL}oauth/token`;
//   const options = {
//     // url,
//     method: 'POST',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify({
//       grant_type: 'client_credentials',
//       client_id: 'MknzIPbTQLtbEF3UmpjnDFpxrgV0JQHE',
//       client_secret: 'EmrXa1F_wxItmXlUSyyvui5gsjKiRNnARifovsz36PP6Lm7OrxaL21cNZRtXamtJ',
//       audience: `${AUTH0_ISSUER_BASE_URL}api/v2/`
//     })
//   };

//   console.log('Generate auth0token', url, options);

//   fetch(url, options).then((res) => res.json())
//     .then(function (data) {
//       console.log(data);
//     })
//     .catch(function (error) {
//       console.error(error);
//     });
// }

const testStuff = async () => {
  const MGMT_TOKEN = await getToken();
  // const MGMT_TOKEN =
  //   'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ikhwc2xjWE5MbnhmS2FMOWllck9NTSJ9.eyJpc3MiOiJodHRwczovL3NvY2t6LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJNa256SVBiVFFMdGJFRjNVbXBqbkRGcHhyZ1YwSlFIRUBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9zb2Nrei51cy5hdXRoMC5jb20vYXBpL3YyLyIsImlhdCI6MTY0NzE1NDA4MywiZXhwIjoxNjQ3MjQwNDgzLCJhenAiOiJNa256SVBiVFFMdGJFRjNVbXBqbkRGcHhyZ1YwSlFIRSIsInNjb3BlIjoicmVhZDpjbGllbnRfZ3JhbnRzIGNyZWF0ZTpjbGllbnRfZ3JhbnRzIGRlbGV0ZTpjbGllbnRfZ3JhbnRzIHVwZGF0ZTpjbGllbnRfZ3JhbnRzIHJlYWQ6dXNlcnMgdXBkYXRlOnVzZXJzIGRlbGV0ZTp1c2VycyBjcmVhdGU6dXNlcnMgcmVhZDp1c2Vyc19hcHBfbWV0YWRhdGEgdXBkYXRlOnVzZXJzX2FwcF9tZXRhZGF0YSBkZWxldGU6dXNlcnNfYXBwX21ldGFkYXRhIGNyZWF0ZTp1c2Vyc19hcHBfbWV0YWRhdGEgcmVhZDp1c2VyX2N1c3RvbV9ibG9ja3MgY3JlYXRlOnVzZXJfY3VzdG9tX2Jsb2NrcyBkZWxldGU6dXNlcl9jdXN0b21fYmxvY2tzIGNyZWF0ZTp1c2VyX3RpY2tldHMgcmVhZDpjbGllbnRzIHVwZGF0ZTpjbGllbnRzIGRlbGV0ZTpjbGllbnRzIGNyZWF0ZTpjbGllbnRzIHJlYWQ6Y2xpZW50X2tleXMgdXBkYXRlOmNsaWVudF9rZXlzIGRlbGV0ZTpjbGllbnRfa2V5cyBjcmVhdGU6Y2xpZW50X2tleXMgcmVhZDpjb25uZWN0aW9ucyB1cGRhdGU6Y29ubmVjdGlvbnMgZGVsZXRlOmNvbm5lY3Rpb25zIGNyZWF0ZTpjb25uZWN0aW9ucyByZWFkOnJlc291cmNlX3NlcnZlcnMgdXBkYXRlOnJlc291cmNlX3NlcnZlcnMgZGVsZXRlOnJlc291cmNlX3NlcnZlcnMgY3JlYXRlOnJlc291cmNlX3NlcnZlcnMgcmVhZDpkZXZpY2VfY3JlZGVudGlhbHMgdXBkYXRlOmRldmljZV9jcmVkZW50aWFscyBkZWxldGU6ZGV2aWNlX2NyZWRlbnRpYWxzIGNyZWF0ZTpkZXZpY2VfY3JlZGVudGlhbHMgcmVhZDpydWxlcyB1cGRhdGU6cnVsZXMgZGVsZXRlOnJ1bGVzIGNyZWF0ZTpydWxlcyByZWFkOnJ1bGVzX2NvbmZpZ3MgdXBkYXRlOnJ1bGVzX2NvbmZpZ3MgZGVsZXRlOnJ1bGVzX2NvbmZpZ3MgcmVhZDpob29rcyB1cGRhdGU6aG9va3MgZGVsZXRlOmhvb2tzIGNyZWF0ZTpob29rcyByZWFkOmFjdGlvbnMgdXBkYXRlOmFjdGlvbnMgZGVsZXRlOmFjdGlvbnMgY3JlYXRlOmFjdGlvbnMgcmVhZDplbWFpbF9wcm92aWRlciB1cGRhdGU6ZW1haWxfcHJvdmlkZXIgZGVsZXRlOmVtYWlsX3Byb3ZpZGVyIGNyZWF0ZTplbWFpbF9wcm92aWRlciBibGFja2xpc3Q6dG9rZW5zIHJlYWQ6c3RhdHMgcmVhZDppbnNpZ2h0cyByZWFkOnRlbmFudF9zZXR0aW5ncyB1cGRhdGU6dGVuYW50X3NldHRpbmdzIHJlYWQ6bG9ncyByZWFkOmxvZ3NfdXNlcnMgcmVhZDpzaGllbGRzIGNyZWF0ZTpzaGllbGRzIHVwZGF0ZTpzaGllbGRzIGRlbGV0ZTpzaGllbGRzIHJlYWQ6YW5vbWFseV9ibG9ja3MgZGVsZXRlOmFub21hbHlfYmxvY2tzIHVwZGF0ZTp0cmlnZ2VycyByZWFkOnRyaWdnZXJzIHJlYWQ6Z3JhbnRzIGRlbGV0ZTpncmFudHMgcmVhZDpndWFyZGlhbl9mYWN0b3JzIHVwZGF0ZTpndWFyZGlhbl9mYWN0b3JzIHJlYWQ6Z3VhcmRpYW5fZW5yb2xsbWVudHMgZGVsZXRlOmd1YXJkaWFuX2Vucm9sbG1lbnRzIGNyZWF0ZTpndWFyZGlhbl9lbnJvbGxtZW50X3RpY2tldHMgcmVhZDp1c2VyX2lkcF90b2tlbnMgY3JlYXRlOnBhc3N3b3Jkc19jaGVja2luZ19qb2IgZGVsZXRlOnBhc3N3b3Jkc19jaGVja2luZ19qb2IgcmVhZDpjdXN0b21fZG9tYWlucyBkZWxldGU6Y3VzdG9tX2RvbWFpbnMgY3JlYXRlOmN1c3RvbV9kb21haW5zIHVwZGF0ZTpjdXN0b21fZG9tYWlucyByZWFkOmVtYWlsX3RlbXBsYXRlcyBjcmVhdGU6ZW1haWxfdGVtcGxhdGVzIHVwZGF0ZTplbWFpbF90ZW1wbGF0ZXMgcmVhZDptZmFfcG9saWNpZXMgdXBkYXRlOm1mYV9wb2xpY2llcyByZWFkOnJvbGVzIGNyZWF0ZTpyb2xlcyBkZWxldGU6cm9sZXMgdXBkYXRlOnJvbGVzIHJlYWQ6cHJvbXB0cyB1cGRhdGU6cHJvbXB0cyByZWFkOmJyYW5kaW5nIHVwZGF0ZTpicmFuZGluZyBkZWxldGU6YnJhbmRpbmcgcmVhZDpsb2dfc3RyZWFtcyBjcmVhdGU6bG9nX3N0cmVhbXMgZGVsZXRlOmxvZ19zdHJlYW1zIHVwZGF0ZTpsb2dfc3RyZWFtcyBjcmVhdGU6c2lnbmluZ19rZXlzIHJlYWQ6c2lnbmluZ19rZXlzIHVwZGF0ZTpzaWduaW5nX2tleXMgcmVhZDpsaW1pdHMgdXBkYXRlOmxpbWl0cyBjcmVhdGU6cm9sZV9tZW1iZXJzIHJlYWQ6cm9sZV9tZW1iZXJzIGRlbGV0ZTpyb2xlX21lbWJlcnMgcmVhZDplbnRpdGxlbWVudHMgcmVhZDphdHRhY2tfcHJvdGVjdGlvbiB1cGRhdGU6YXR0YWNrX3Byb3RlY3Rpb24gcmVhZDpvcmdhbml6YXRpb25zX3N1bW1hcnkgcmVhZDpvcmdhbml6YXRpb25zIHVwZGF0ZTpvcmdhbml6YXRpb25zIGNyZWF0ZTpvcmdhbml6YXRpb25zIGRlbGV0ZTpvcmdhbml6YXRpb25zIGNyZWF0ZTpvcmdhbml6YXRpb25fbWVtYmVycyByZWFkOm9yZ2FuaXphdGlvbl9tZW1iZXJzIGRlbGV0ZTpvcmdhbml6YXRpb25fbWVtYmVycyBjcmVhdGU6b3JnYW5pemF0aW9uX2Nvbm5lY3Rpb25zIHJlYWQ6b3JnYW5pemF0aW9uX2Nvbm5lY3Rpb25zIHVwZGF0ZTpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgZGVsZXRlOm9yZ2FuaXphdGlvbl9jb25uZWN0aW9ucyBjcmVhdGU6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyByZWFkOm9yZ2FuaXphdGlvbl9tZW1iZXJfcm9sZXMgZGVsZXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJfcm9sZXMgY3JlYXRlOm9yZ2FuaXphdGlvbl9pbnZpdGF0aW9ucyByZWFkOm9yZ2FuaXphdGlvbl9pbnZpdGF0aW9ucyBkZWxldGU6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.CMY3NHboomgFvf-jWMCW8p3oEQGYReIrzjwW-lHtqr3NPveCm3I9ejBdyKUwMaZgO7cHidF_Sl3zTNLo46TmxoRmDdQHJtn5pXGDvREnBNhzqp55PWU5_wMkE6l0aiqg6Gl1KR9MxL1247aq9-IBNge6_4EG4srYyoC-mzHxXg3rKeyHOGW0ESnPQyBmG5OLUBDubivaNXiNyVMi5TRObOPWrZ0ozh4-D4D2OLERiY9aJij2gjOUBbpaL-YB2SLiHRlxinf2kQ3rN8LSJ_d4HVOO-SxzRXSN_S4mLCYc25Zeq4QchWAWo0ZsZOJp5WTddH8FzS7j1VBtG8f9idHSJA';

  const SUPPORT_UID = 'auth0|622992354c83d900703bf2c2';
  const TEST_PERMS = 'admin:clients';
  const TEST_ROLES = [UserRole.AGENT];

  console.log('Auth0 testing stuff...');

  if (AUTH0_ISSUER_DOMAIN && AUTH0_CLIENT_ID && CLIENT_SECRET) {
    // const auth0 = new AuthenticationClient({
    //   domain: AUTH0_ISSUER_DOMAIN,
    //   clientId: AUTH0_CLIENT_ID,
    //   clientSecret: CLIENT_SECRET
    //   // scope: 'read:users update:users',
    // });

    const auth0 = new ManagementClient({
      domain: AUTH0_ISSUER_DOMAIN,
      token: MGMT_TOKEN
    });

    // console.log('Connecting with', auth0);

    // auth0.clientCredentialsGrant(
    //   {
    //     audience: `${AUTH0_ISSUER_BASE_URL}api/v2/`,
    //     scope: 'admin:clients'
    //   },
    //   (err, response) => {
    //     if (err) {
    //       // Handle error.
    //       console.error(err);
    //     }

    //     console.log(response);
    //     console.log(response.access_token);
    //   }
    // );

    /**
     * Other useful methods...
     *
     * - getPermissionsInRole
     * - removePermissionsFromRole
     * - getUsersByEmail
     */

    if (SUPPORT_UID && AUTH0_AUDIENCE) {
      const params = { id: SUPPORT_UID };
      const data = {
        permissions: [{ permission_name: TEST_PERMS, resource_server_identifier: AUTH0_AUDIENCE }]
      };

      console.log('Assigning perms:', {
        params,
        data
      });

      auth0.assignPermissionsToUser(params, data, function (err) {
        if (err) {
          // Handle error.
          console.error(err);
        }

        console.log('Done assigning perms');

        // User assigned permissions.
      });

      // auth0.removePermissionsFromUser(params, data, function (err) {
      //   if (err) {
      //     // Handle error.
      //     console.error(err);
      //   }

      //   // User removed permissions.
      //   console.log('Done removing perms');
      // });

      // const data = { roles: TEST_ROLES };

      // console.log('Removing roles:', {
      //   params,
      //   data
      // });

      // auth0.assignRolestoUser(params, data, function (err) {
      //   if (err) {
      //     // Handle error.
      //     console.error(err);
      //   }

      //   // User assigned roles.
      //   console.log('Done assigning roles');
      // });

      // const params = { id: SUPPORT_UID, page: 0, per_page: 50, include_totals: true };

      // auth0.getUserPermissions(params, function (err, logs) {
      //   if (err) {
      //     // Handle error.
      //     console.error(err);
      //   }

      //   console.log(logs);
      // });

      // Same as permissions req!
      // const params = { id: SUPPORT_UID, page: 0, per_page: 50, include_totals: true };

      // auth0.getUserRoles(params, function (err, logs) {
      //   if (err) {
      //     // Handle error.
      //     console.error(err);
      //   }

      //   console.log(logs);
      // });

      // auth0.removeRolesFromUser(params, data, function (err) {
      //   if (err) {
      //     // Handle error.
      //     console.error(err);
      //   }

      //   // User assigned roles.
      //   console.log('Removed role(s)');
      // });
    }

    auth0
      .getUsers()
      .then(function (users) {
        console.log(users);
        // users.forEach((user) => {
        //   user.
        // })
      })
      .catch(function (err) {
        console.error(err);
        // Handle error.
      });
  }
};

testStuff();
