# ms-ra-forwarder
本次更新同步微软最新支持中文的发音角色数据,较于上次的32种又多了1种,达到33种,本次同步时间为2022年06月12日

创建这个项目的初衷是为了能够在[阅读（legado）](https://github.com/gedoor/legado)中听“晓晓”念书。由于其中的脚本引擎不支持 WebSocket ，所以用 [Vercel](https://vercel.com/) 的 Serverless Function 包装了一下微软 Edge 浏览器“大声朗读”的接口。

如果你的项目可以使用 WebSocket ，请直接在项目中调用原接口。具体代码可以参考 [ra/index.ts](ra/index.ts)。



## 使用
首先要有github账号和Vercel账号。

如果没有Vercel账号，请不要选择第三方账号登陆如github账号,因为后面绑定手机号是通不过的,提示不存在账号,最好使用电子邮件方式注册账号!

请先 Fork 一份代码然后部署到自己的 Vercel 中 （[演示视频](https://www.youtube.com/watch?v=vRC6umZp8hI)）。

### 导入到阅读（legado）

请访问你部署好的网站，在页面中测试没有问题后点击“生成阅读（legado）语音引擎链接”，然后在阅读（legado）中导入。

### 手动调用

接口地址为：
```
POST /api/ra
FORMAT: audio-16khz-128kbitrate-mono-mp3
Content-Type: text/plain

<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="zh-CN-XiaoxiaoNeural">
    表征这个词印象中就没在中文里见到过
  </voice>
</speak>
```

#### 定制发音和音色
请求的正文为 ssml 格式，支持定制发音人和说话风格，下面是相关的示例和文档：

[文本转语音](https://azure.microsoft.com/zh-cn/services/cognitive-services/text-to-speech/#overview)

[通过语音合成标记语言 (SSML) 改善合成](https://docs.microsoft.com/zh-cn/azure/cognitive-services/speech-service/speech-synthesis-markup?tabs=csharp)



#### 音频格式
默认的音频格式为 mp3 ，如果需要获取为其他格式的音频请修改请求头的 `FORMAT`（可用的选项可以在 [ra/index.ts](ra/index.ts#L5) 中查看）。

### 限制访问

由于 Vercel 并非无限制的免费，如果需要防止他人滥用你的部署的服务，可以在应用的环境变量中添加 `TOKEN`，然后在请求头中添加 `Authorization: Bearer <TOKEN>`访问。注意：这只会阻止未授权的请求调用微软的接口，并不会减少  Vercel Serverless Function 限额的用量（大概会减少一点流量）。

## 其他说明

- 微软官方的 Azure TTS 服务目前拥有一定的免费额度，如果免费额度对你来说够用的话，请支持官方的服务。

- 如果只需要为固定的文本生成语音，可以使用[有声内容创作](https://speech.microsoft.com/audiocontentcreation)。它提供了更丰富的功能可以生成更自然的声音。

- 本项目使用的是Edge浏览器“大声朗读”功能的接口，不保证后续可用性和稳定性。

- **本项目仅供学习和参考，请勿商用。**
