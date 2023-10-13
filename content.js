const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

class Script {
  constructor(checkVerifiedUsers) {
    this.checkVerifiedUsers = checkVerifiedUsers;
    this.unfollowers = [];
    this.canQuery = false;
    this.nextPageHash = "";
    this.requestsCount = 0;
    this.followingCount = 0;
    this.currentPageCount = 0;
    this.estimatedStepValue = 0;
  }

  async getCookie(cookieName) {
    return new Promise((resolve, reject) => {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const pair = cookie.split("=");
        if (pair[0].trim() === cookieName) resolve(decodeURIComponent(pair[1]);
      }
      reject("Cookie not found!");
    });
  }

  createURLParamsString(params) {
    return Object.keys(params).map(key => {
      const value = params[key];
      if (typeof value === "object") return `${key}=${JSON.stringify(value)}`;
      else return `${key}=${value}`;
    }).join("&");
  }

  async generateURL() {
    const params = {
      query_hash: "3dec7e2c57367ef3da3d987d89f9dbc8",
      variables: {
        id: await this.getCookie("ds_user_id"),
        first: "1000"
      }
    };

    if (this.nextPageHash) params.variables.after = this.nextPageHash;
    return `https://www.instagram.com/graphql/query/?${this.createURLParamsString(params)}`;
  }

  onFinish(callback) {
    this.finishCallback = callback;
  }

  async startScript() {
    try {
      do {
        if (this.requestsCount !== 0 && this.requestsCount % 5 === 0) await handleOutput("RATE_LIMIT");
        const url = await this.generateURL();
        const { data } = await fetch(url).then(res => res.json());

        if (this.checkVerifiedUsers) {
          data.user.edge_follow.edges.forEach(edge => {
            if (!edge.node.follows_viewer) this.unfollowers.push({
              username: edge.node.username,
              isVerified: edge.node.is_verified
            });
          });
        } else {
          data.user.edge_follow.edges.forEach(edge => {
            if (!edge.node.is_verified && !edge.node.follows_viewer) this.unfollowers.push({
              username: edge.node.username
            });
          });
        }

        this.canQuery = data.user.edge_follow.page_info.has_next_page;
        this.nextPageHash = data.user.edge_follow.page_info.end_cursor;
        this.requestsCount++;
        this.followingCount = data.user.edge_follow.count;
        this.currentPageCount += data.user.edge_follow.edges.length;

        if (this.estimatedStepValue === 0) this.estimatedStepValue = data.user.edge_follow.edges.length;
        handleOutput("PROGRESS", {
          currentPageCount: this.currentPageCount,
          estimatedStepValue: this.estimatedStepValue,
          followingCount: this.followingCount
        });
        await sleep(3000);
      } while (this.canQuery);

      handleOutput("FINISH", {
        unfollowers: this.unfollowers
      });

      if (this.finishCallback) {
        this.finishCallback(this.unfollowers);
      }

    } catch (error) {
      return console.error(`Something went wrong!\n${error}`);
    }
  }
}

const script = new Script(false);
script.onFinish((unfollowers) => {
  // Handle the results sent by the Instagram script
  console.log(unfollowers);
});

script.startScript();
