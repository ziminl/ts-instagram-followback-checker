const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function handleOutput(type, data) {
    const outputDiv = document.getElementById('output');

    if (type === 'PROGRESS') {
        outputDiv.innerHTML = `<p>실행중! ${data.currentPageCount} 개 중 ${data.followingCount} 개 완료 (${parseInt(data.currentPageCount / data.followingCount * 100)}%) - 예정시간: ${getMinutes()}</p>`;
    } else if (type === 'RATE_LIMIT') {
        outputDiv.innerHTML = '<p>RATE LIMIT. 15초 후에 다시 실행합니다.</p>';
        await sleep(15000);
    } else if (type === 'FINISH') {
        outputDiv.innerHTML = '<p>모든사람이 님 맞팔로우함.</p>';
    }
}

// Rest of your Instagram tracking script here

const checkVerifiedUsers = confirm('맞팔로우 추적기를 실행할까요?');
const script = new Script(checkVerifiedUsers);

script.startScript();
