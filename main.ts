import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, Vault } from 'obsidian';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface S3ForAllPluginSettings {
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    folderPath: string;
	region: string;
    endpoint: string;
}

const DEFAULT_SETTINGS: S3ForAllPluginSettings = {
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: '',
    folderPath: '',
	region: '',
    endpoint: ''
};

export default class S3ForAllPlugin extends Plugin {
    settings: S3ForAllPluginSettings;

    async onload() {
        await this.loadSettings();

        this.addCommand({
            id: 'upload-to-s3',
            name: 'Upload to S3 storage',
            callback: () => this.uploadToS3(),
        });
        
        this.addRibbonIcon("upload-cloud", "Upload to S3 storage", () => {
            this.uploadToS3();
          });
        
        this.addSettingTab(new S3ForAllSettingTab(this.app, this));

        this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
            console.log('click', evt);
        });
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async uploadToS3() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (!activeLeaf) return;

        const activeView = activeLeaf.view;
        if (!(activeView instanceof MarkdownView)) return;

        const editor = activeView.editor;
        const fileContent = editor.getValue();
        const fileName = activeView.file.name; // here i achieve a "possibly null" error but it works so idc

        const { accessKeyId, secretAccessKey, bucketName, folderPath, region, endpoint } = this.settings;
		
        const s3Client = new S3Client({
            region: region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
			endpoint: endpoint,
        });

        const params = {
            Bucket: bucketName,
            Key: folderPath ? `${folderPath}/${fileName}` : fileName,
            Body: fileContent,
        };

        try {
            const command = new PutObjectCommand(params);
            await s3Client.send(command);

            new Notice(`File "${fileName}" successfully uploaded to ${folderPath} in S3!`);
        } catch (error) {
            console.error('Errno:', error);
            new Notice('Error uploading file to S3. See console for details.');
        }
    }
}

class S3ForAllSettingTab extends PluginSettingTab {
    plugin: S3ForAllPlugin;

    constructor(app: App, plugin: S3ForAllPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Access Key ID')
            .addText((text) =>
                text
                    .setPlaceholder('Enter your Access Key ID')
                    .setValue(this.plugin.settings.accessKeyId)
                    .onChange(async (value) => {
                        this.plugin.settings.accessKeyId = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Secret Access Key')
            .addText((text) =>
                text
                    .setPlaceholder('Enter your Secret Access Key')
                    .setValue(this.plugin.settings.secretAccessKey)
                    .onChange(async (value) => {
                        this.plugin.settings.secretAccessKey = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Bucket Name')
            .addText((text) =>
                text
                    .setPlaceholder('Enter your S3 bucket name')
                    .setValue(this.plugin.settings.bucketName)
                    .onChange(async (value) => {
                        this.plugin.settings.bucketName = value;
                        await this.plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Folder Path (optional)')
            .setDesc('Enter a folder path within the bucket (leave empty for root).')
            .addText((text) =>
                text
                    .setPlaceholder('Enter folder path')
                    .setValue(this.plugin.settings.folderPath)
                    .onChange(async (value) => {
                        this.plugin.settings.folderPath = value;
                        await this.plugin.saveSettings();
                    })
            );
		
		new Setting(containerEl)
            .setName('Storage region')
            .setDesc('Enter your region, ex. ru-central1.')
            .addText((text) =>
                text
                    .setPlaceholder('Enter storage region')
                    .setValue(this.plugin.settings.region)
                    .onChange(async (value) => {
                        this.plugin.settings.region = value;
                        await this.plugin.saveSettings();
                    })
            );
        
        new Setting(containerEl)
            .setName('Endpoint')
            .setDesc('Enter your endpoint, ex. https://my.endpoint.net')
            .addText((text) =>
                text
                    .setPlaceholder('Enter endpoint')
                    .setValue(this.plugin.settings.endpoint)
                    .onChange(async (value) => {
                        this.plugin.settings.endpoint = value;
                        await this.plugin.saveSettings();
                    })
            );
        
    }
}
