


const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const handleOutput = (type, data) => {
  const css = `padding: 0.5rem 0; font-size: 1rem; font-weight: 700;`;
  const getMinutes = () => {
    const steps = Math.floor((data.followingCount - data.currentPageCount) / data.estimatedStepValue);
    const seconds = steps * 3 + Math.floor((steps / 5) * 15);
    const minutes = Math.floor(seconds / 60);
    return minutes <= 1 ? "1분내" : `${minutes} 분`;
  };

  console.clear();
  if (type === "PROGRESS") {
    console.warn(
      `%c실행중! ${data.currentPageCount} 개 중 ${data.followingCount} 개 완료 (${parseInt(
        (data.currentPageCount / data.followingCount) * 100
      )}%) - 예정시간: ${getMinutes()}`,
      css
    );
  } else if (type === "RATE_LIMIT") {
    console.warn("%cRATE LIMIT. 15초 후에 다시 실행합니다.", css);
  } else if (type === "FINISH") {
    if (data.unfollowers.length === 0) {
      console.warn(`%c모든사람이 님 맞팔로우함.`, css);
    } else {
      console.group(`%c ${data.unfollowers.length} 명이 맞팔하지 않습니다.`, css);
      data.unfollowers.forEach((unfollower) =>
        console.log(`${unfollower.username}${unfollower.isVerified ? "!" : ""} - https://www.instagram.com/${unfollower.username}/`)
      );
      console.groupEnd();
    }
  }
};

class Script {
  constructor(checkVerifiedUsers, cookies) {
    this.checkVerifiedUsers = checkVerifiedUsers;
    this.unfollowers = [];
    this.canQuery = true;
    this.nextPageHash = "";
    this.requestsCount = 0;
    this.followingCount = 0;
    this.currentPageCount = 0;
    this.estimatedStepValue = 0;
    this.cookies = cookies;
  }

  async getCookie(cookieName) {
    for (const cookie of this.cookies.split(";")) {
      const [key, value] = cookie.split("=");
      if (key.trim() === cookieName) {
        return decodeURIComponent(value);
      }
    }
    throw new Error("Cookie not found!");
  }

  createURLParamsString(params) {
    return new URLSearchParams(params).toString();
  }

  async generateURL() {
    const id = await this.getCookie("ds_user_id");
    const params = new URLSearchParams({
      query_hash: "3dec7e2c57367ef3da3d987d89f9dbc8",
      variables: JSON.stringify({ id, first: "1000", ...(this.nextPageHash && { after: this.nextPageHash }) }),
    });

    return `https://www.instagram.com/graphql/query/?${params}`;
  }

  async startScript() {
    try {
      while (this.canQuery) {
        if (this.requestsCount !== 0 && this.requestsCount % 5 === 0) {
          handleOutput("RATE_LIMIT");
          await sleep(15000);
        }

        const url = await this.generateURL();
        const { data } = await fetch(url).then((res) => res.json());

        data.user.edge_follow.edges.forEach((edge) => {
          if (!edge.node.follows_viewer && (!this.checkVerifiedUsers || !edge.node.is_verified)) {
            this.unfollowers.push({
              username: edge.node.username,
              isVerified: edge.node.is_verified,
            });
          }
        });

        this.canQuery = data.user.edge_follow.page_info.has_next_page;
        this.nextPageHash = data.user.edge_follow.page_info.end_cursor;
        this.requestsCount++;
        this.followingCount = data.user.edge_follow.count;
        this.currentPageCount += data.user.edge_follow.edges.length;

        if (this.estimatedStepValue === 0) {
          this.estimatedStepValue = data.user.edge_follow.edges.length;
        }

        handleOutput("PROGRESS", {
          currentPageCount: this.currentPageCount,
          estimatedStepValue: this.estimatedStepValue,
          followingCount: this.followingCount,
        });
        await sleep(3000);
      }

      handleOutput("FINISH", {
        unfollowers: this.unfollowers,
      });
    } catch (error) {
      console.error(`Something went wrong!\n${error}`);
    }
  }
}


const cookies = 'your_cookie_string_here';
new Script(true, cookies).startScript();


