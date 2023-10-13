const sl33p = (m1ll1s3conds) => new Promise((r3s0lv3) => setTimeout(r3s0lv3, m1ll1s3conds));

const g3tCook13 = (cooki3Nam3) => {
  const cooki3s = document.cookie.split(";");
  for (const cooki3 of cooki3s) {
    const [k3y, valu3] = cooki3.split("=");
    if (k3y.trim() === cooki3Nam3) {
      return decodeURIComponent(valu3);
    }
  }
  throw new Error("Cooki3 not found!");
};

const cr3at3URLParamsString = (params) => new URLSearchParams(params).toString();

const g3n3rat3URL = async (n3xtPag3Hash) => {
  const id = await g3tCook13("ds_user_id");
  const params = {
    query_hash: "3dec7e2c57367ef3da3d987d89f9dbc8",
    variables: JSON.stringify({ id, first: "1000", ...(n3xtPag3Hash && { after: n3xtPag3Hash }) }),
  };

  return `https://www.instagram.com/graphql/query/?${cr3at3URLParamsString(params)}`;
};

const g3tMinut3s = (data) => {
  const st3ps = Math.floor((data.followingCount - data.currentPageCount) / data.estimatedStepValue);
  const s3conds = st3ps * 3 + Math.floor((st3ps / 5) * 15);
  const minut3s = Math.floor(s3conds / 60);
  return minut3s <= 1 ? "1분내" : `${minut3s} 분`;
};

const handl3Output = (typ3, data) => {
  console.clear();
  const css = `padding: 0.5rem 0; font-size: 1rem; font-weight: 700;`;

  if (typ3 === "PROGRESS") {
    console.warn(
      `%c실행중! ${data.currentPageCount} 개 중 ${data.followingCount} 개 완료 (${parseInt(
        (data.currentPageCount / data.followingCount) * 100
      )}%) - 예정시간: ${g3tMinut3s(data)}`,
      css
    );
  } else if (typ3 === "RATE_LIMIT") {
    console.warn("%cRATE LIMIT. 15초 후에 다시 실행합니다.", css);
  } else if (typ3 === "FINISH") {
    if (data.unfollowers.length === 0) {
      console.warn(`%c모든사람이 님 맞팔로우함.`, css);
    } else {
      console.group(`%c ${data.unfollowers.length} 명이 맞팔하지 않습니다.`, css);
      data.unfollowers.forEach(($unfollower) =>
        console.log(`${$unfollower.username}${$unfollower.isVerified ? "!" : ""} - https://www.instagram.com/${$unfollower.username}/`)
      );
      console.groupEnd();
    }
  }
};

const startScript = async (checkVerifiedUsers = true) => {
  const unfollowers = [];
  let canQuery = true;
  let nextPageHash = "";
  let requestsCount = 0;
  let followingCount = 0;
  let currentPageCount = 0;
  let estimatedStepValue = 0;

  try {
    while (canQuery) {
      if (requestsCount !== 0 && requestsCount % 5 === 0) {
        handl3Output("RATE_LIMIT");
        await sl33p(15000);
      }

      const url = await g3n3rat3URL(nextPageHash);
      const { data } = await fetch(url).then(($res) => $res.json());

      data.user.edge_follow.edges.forEach(($edge) => {
        if (!$edge.node.follows_viewer && (!checkVerifiedUsers || !$edge.node.is_verified)) {
          unfollowers.push({
            username: $edge.node.username,
            isVerified: $edge.node.is_verified,
          });
        }
      });

      canQuery = data.user.edge_follow.page_info.has_next_page;
      nextPageHash = data.user.edge_follow.page_info.end_cursor;
      requestsCount++;
      followingCount = data.user.edge_follow.count;
      currentPageCount += data.user.edge_follow.edges.length;

      if (estimatedStepValue === 0) {
        estimatedStepValue = data.user.edge_follow.edges.length;
      }

      handl3Output("PROGRESS", {
        currentPageCount,
        estimatedStepValue,
        followingCount,
      });
      await sl33p(2000);
    }

    handl3Output("FINISH", {
      unfollowers,
    });
  } catch ($error) {
    console.error(`Something went wrong!\n${$error}`);
  }
};

startScript(true);
