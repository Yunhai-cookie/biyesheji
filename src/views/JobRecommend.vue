<template>
  <div class="position-container">
    <!-- 筛选栏（返回主页面 + 智能选岗 + 查询/重置） -->
    <div class="filter-bar">
      <!-- 返回主页面按钮 -->
      <div class="back-btn">
        <el-button type="default" @click="goToHome" icon="House">
          返回主页面
        </el-button>
      </div>
      
      <div class="filter-item">
        <label>招考单位：</label>
        <el-input 
          v-model="filterForm.recruitUnit" 
          placeholder="请输入招考单位关键词" 
          clearable
          style="width: 300px;"
        ></el-input>
      </div>
      
      <div class="filter-item">
        <label>考区：</label>
        <el-select 
          v-model="filterForm.examArea" 
          placeholder="请选择考区" 
          clearable
          style="width: 200px;"
        >
          <el-option label="广州" value="广州"></el-option>
          <el-option label="深圳" value="深圳"></el-option>
          <el-option label="珠海" value="珠海"></el-option>
        </el-select>
      </div>
      
      <div class="filter-actions">
        <!-- 智能选岗按钮 -->
        <el-button type="primary" @click="openSmartSelect" size="default">
          <el-icon><MagicStick /></el-icon> 智能选岗
        </el-button>
        <el-button type="primary" @click="handleQuery">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </div>

    <!-- 岗位表格 -->
    <div class="position-table-wrapper">
      <el-table
        ref="positionTableRef"
        :data="positionList"
        border
        stripe
        :header-cell-style="{background: '#f5f7fa', fontWeight: 'bold'}"
        :cell-style="{padding: '8px 4px'}"
        size="small"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <!-- 全选列 -->
        <el-table-column type="selection" width="50"></el-table-column>
        
        <!-- 序号列 -->
        <el-table-column type="index" label="序号" width="60"></el-table-column>
        
        <!-- 岗位信息列 -->
        <el-table-column prop="recruitUnit" label="招考单位" min-width="200"></el-table-column>
        <el-table-column prop="unitCode" label="单位代码" width="100"></el-table-column>
        <el-table-column prop="recruitPosition" label="招考职位" min-width="200"></el-table-column>
        <el-table-column prop="positionCode" label="职位代码" width="120"></el-table-column>
        <el-table-column prop="positionIntro" label="职位简介" min-width="200"></el-table-column>
        <el-table-column prop="positionType" label="职位类型" width="120">
          <template #default="scope">
            <el-tag size="small" :type="scope.row.positionType.includes('行政执法') ? 'warning' : 'primary'">
              {{ scope.row.positionType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recruitNum" label="录用人数" width="80"></el-table-column>
        <el-table-column prop="education" label="学历" width="100"></el-table-column>
        <el-table-column prop="degree" label="学位" width="100"></el-table-column>
        
        <!-- 本科专业要求（带tooltip） -->
        <el-table-column prop="undergraduateMajor" label="本科专业要求" min-width="300">
          <template #default="scope">
            <el-tooltip :content="scope.row.undergraduateMajor" placement="top">
              <div class="major-tooltip">
                {{ scope.row.undergraduateMajor.length > 50 ? scope.row.undergraduateMajor.substring(0, 50) + '...' : scope.row.undergraduateMajor }}
              </div>
            </el-tooltip>
          </template>
        </el-table-column>
        
        <el-table-column prop="otherRequirements" label="其他要求" min-width="120">
          <template #default="scope">
            <el-tag size="small" v-if="scope.row.otherRequirements">
              {{ scope.row.otherRequirements }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="examArea" label="考区" width="80">
          <template #default="scope">
            <el-tag size="small" type="success">{{ scope.row.examArea }}</el-tag>
          </template>
        </el-table-column>
        
        <!-- 分数线列 -->
        <el-table-column prop="score" label="岗位分数线" width="120">
          <template #default="scope">
            <el-tag size="small" type="info">
              {{ scope.row.score || '暂无' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <!-- 操作列 -->
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewDetail(scope.row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页控件 -->
      <div class="pagination-wrapper">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.pageNum"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
        ></el-pagination>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div class="batch-actions" v-if="selectedPositions.length > 0">
      <span>已选择 {{ selectedPositions.length }} 个职位</span>
      <el-button size="small" type="danger" @click="clearSelection">清空选择</el-button>
      <el-button size="small" type="success" @click="exportSelected">导出选中职位</el-button>
    </div>

    <!-- 职位详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="职位详情"
      width="800px"
      destroy-on-close
    >
      <!-- 智能选岗结果提示 -->
      <div v-if="isSmartSelectResult" class="smart-result-tip">
        <el-tag type="info">
          智能选岗结果：第 {{ currentSmartIndex + 1 }} / {{ smartFilteredList.length }} 个推荐岗位
        </el-tag>
      </div>
      
      <el-descriptions :column="2" border>
        <el-descriptions-item label="招考单位">{{ currentPosition.recruitUnit || '-' }}</el-descriptions-item>
        <el-descriptions-item label="单位代码">{{ currentPosition.unitCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="招考职位">{{ currentPosition.recruitPosition || '-' }}</el-descriptions-item>
        <el-descriptions-item label="职位代码">{{ currentPosition.positionCode || '-' }}</el-descriptions-item>
        <el-descriptions-item label="职位类型">{{ currentPosition.positionType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="录用人数">{{ currentPosition.recruitNum || '-' }}</el-descriptions-item>
        <el-descriptions-item label="学历要求">{{ currentPosition.education || '-' }}</el-descriptions-item>
        <el-descriptions-item label="学位要求">{{ currentPosition.degree || '-' }}</el-descriptions-item>
        <el-descriptions-item label="考区">{{ currentPosition.examArea || '-' }}</el-descriptions-item>
        <el-descriptions-item label="岗位分数线">{{ currentPosition.score || '暂无' }}</el-descriptions-item>
        <el-descriptions-item label="其他要求">{{ currentPosition.otherRequirements || '-' }}</el-descriptions-item>
        <el-descriptions-item label="职位简介" :span="2">{{ currentPosition.positionIntro || '-' }}</el-descriptions-item>
        <el-descriptions-item label="本科专业要求" :span="2">
          <div style="white-space: pre-wrap;">{{ currentPosition.undergraduateMajor || '-' }}</div>
        </el-descriptions-item>
      </el-descriptions>
      
      <!-- 下一个低分岗位按钮 -->
      <div v-if="isSmartSelectResult" class="next-btn-wrapper" style="text-align: right; margin-top: 20px;">
        <el-button 
          type="primary" 
          @click="showNextSmartPosition"
          :disabled="currentSmartIndex >= smartFilteredList.length - 1"
        >
          下一个推荐岗位
        </el-button>
      </div>
    </el-dialog>

    <!-- 智能选岗筛选弹窗 -->
    <el-dialog
      v-model="smartSelectVisible"
      title="智能选岗筛选条件"
      width="600px"
      destroy-on-close
    >
      <el-form :model="smartFilterForm" label-width="100px" ref="smartFilterFormRef">
        <el-form-item label="学历要求" prop="education">
          <el-select v-model="smartFilterForm.education" placeholder="请选择学历" clearable>
            <el-option label="本科" value="本科"></el-option>
            <el-option label="硕士" value="硕士"></el-option>
            <el-option label="博士" value="博士"></el-option>
            <el-option label="不限" value="不限"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="本科专业" prop="major">
          <el-input 
            v-model="smartFilterForm.major" 
            placeholder="请输入专业关键词（模糊匹配）" 
            clearable
          ></el-input>
        </el-form-item>
        <el-form-item label="考区" prop="examArea">
          <el-select v-model="smartFilterForm.examArea" placeholder="请选择考区" clearable>
            <el-option label="广州" value="广州"></el-option>
            <el-option label="深圳" value="深圳"></el-option>
            <el-option label="珠海" value="珠海"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div style="text-align: right; margin-top: 20px;">
        <el-button @click="smartSelectVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSmartSelect">开始选岗</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MagicStick, House } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import request from '@/utils/request';

// 路由实例
const router = useRouter();

// 表格Ref
const positionTableRef = ref(null);
// 加载状态
const loading = ref(false);

// 筛选表单
const filterForm = reactive({
  recruitUnit: '',
  examArea: ''
});

// 分页参数
const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0
});

// 岗位列表
const positionList = ref([]);
// 选中的岗位
const selectedPositions = ref([]);

// 详情弹窗
const detailDialogVisible = ref(false);
const currentPosition = reactive({});

// 智能选岗相关
const smartSelectVisible = ref(false);
const smartFilterForm = reactive({
  education: '',
  major: '',
  examArea: ''
});
const smartFilterFormRef = ref(null);
const smartFilteredList = ref([]);
const currentSmartIndex = ref(0);
const isSmartSelectResult = ref(false);

/**
 * 返回主页面
 */
const goToHome = () => {
  router.push('/').then(() => {
    ElMessage.success('已返回主页面！');
  }).catch(err => {
    console.error('跳转失败：', err);
    ElMessage.error('返回主页面失败，请重试！');
  });
};

/**
 * 查询岗位列表
 */
const getPositionList = async () => {
  loading.value = true;
  try {
    const res = await request.get('/api/position/page', {
      params: {
        pageNum: pagination.pageNum,
        pageSize: pagination.pageSize,
        recruitUnit: filterForm.recruitUnit,
        examArea: filterForm.examArea
      }
    });
    if (res.code === 200) {
      positionList.value = res.data.records;
      pagination.total = res.data.total;
      pagination.pageNum = res.data.current;
      pagination.pageSize = res.data.size;
    } else {
      ElMessage.error(res.msg || '查询职位失败');
    }
  } catch (error) {
    console.error('请求异常：', error);
    if (error.response) {
      ElMessage.error(`请求失败：${error.response.data?.msg || error.response.statusText}`);
    } else if (error.request) {
      ElMessage.error('网络异常，未收到后端响应，请检查后端服务是否启动');
    } else {
      ElMessage.error(`请求错误：${error.message}`);
    }
  } finally {
    loading.value = false;
  }
};

/**
 * 处理查询
 */
const handleQuery = () => {
  pagination.pageNum = 1;
  getPositionList();
};

/**
 * 重置筛选条件
 */
const resetFilter = () => {
  filterForm.recruitUnit = '';
  filterForm.examArea = '';
  pagination.pageNum = 1;
  getPositionList();
};

/**
 * 分页大小改变
 */
const handleSizeChange = (val) => {
  pagination.pageSize = val;
  getPositionList();
};

/**
 * 当前页改变
 */
const handleCurrentChange = (val) => {
  pagination.pageNum = val;
  getPositionList();
};

/**
 * 选择项改变
 */
const handleSelectionChange = (val) => {
  selectedPositions.value = val;
};

/**
 * 清空选择
 */
const clearSelection = () => {
  selectedPositions.value = [];
  if (positionTableRef.value) {
    positionTableRef.value.clearSelection();
  }
};

/**
 * 查看岗位详情
 */
const viewDetail = (row) => {
  isSmartSelectResult.value = false;
  Object.keys(currentPosition).forEach(key => delete currentPosition[key]);
  Object.assign(currentPosition, JSON.parse(JSON.stringify(row)));
  detailDialogVisible.value = false;
  nextTick(() => {
    detailDialogVisible.value = true;
  });
};

/**
 * 导出选中岗位
 */
const exportSelected = () => {
  if (selectedPositions.value.length === 0) {
    ElMessage.warning('请选择要导出的职位');
    return;
  }
  ElMessage.success(`已导出 ${selectedPositions.value.length} 个职位数据`);
  const exportData = selectedPositions.value.map(item => ({
    招考单位: item.recruitUnit,
    单位代码: item.unitCode,
    招考职位: item.recruitPosition,
    职位代码: item.positionCode,
    考区: item.examArea,
    学历要求: item.education,
    录用人数: item.recruitNum,
    岗位分数线: item.score || '暂无'
  }));
  console.log('导出数据：', exportData);
};

/**
 * 打开智能选岗弹窗
 */
const openSmartSelect = () => {
  smartFilterForm.education = '';
  smartFilterForm.major = '';
  smartFilterForm.examArea = '';
  smartSelectVisible.value = true;
};

/**
 * 处理智能选岗
 */
const handleSmartSelect = async () => {
  if (!smartFilterForm.education && !smartFilterForm.major && !smartFilterForm.examArea) {
    ElMessage.warning('请至少选择一个筛选条件！');
    return;
  }

  loading.value = true;
  try {
    const res = await request.get('/api/position/page', {
      params: {
        pageNum: 1,
        pageSize: 9999,
        recruitUnit: '',
        examArea: ''
      }
    });

    if (res.code !== 200) {
      ElMessage.error('获取职位数据失败！');
      return;
    }

    const allPositions = res.data.records;
    if (allPositions.length === 0) {
      ElMessage.warning('暂无职位数据！');
      return;
    }

    // 筛选符合条件的岗位
    let filtered = allPositions.filter(item => {
      if (smartFilterForm.education && smartFilterForm.education !== '不限') {
        if (item.education !== smartFilterForm.education) return false;
      }
      if (smartFilterForm.major) {
        if (!item.undergraduateMajor || !item.undergraduateMajor.includes(smartFilterForm.major)) return false;
      }
      if (smartFilterForm.examArea) {
        if (item.examArea !== smartFilterForm.examArea) return false;
      }
      if (!item.score || item.score === 0) return false;
      return true;
    });

    if (filtered.length === 0) {
      ElMessageBox.warning('未找到符合条件的岗位！', '提示');
      smartSelectVisible.value = false;
      return;
    }

    // 按分数升序排序
    filtered.sort((a, b) => a.score - b.score);
    smartFilteredList.value = filtered;
    currentSmartIndex.value = 0;

    // 显示第一个低分岗位
    isSmartSelectResult.value = true;
    Object.keys(currentPosition).forEach(key => delete currentPosition[key]);
    Object.assign(currentPosition, JSON.parse(JSON.stringify(filtered[0])));
    
    smartSelectVisible.value = false;
    nextTick(() => {
      detailDialogVisible.value = true;
    });

    ElMessage.success(`找到 ${filtered.length} 个符合条件的岗位，已显示分数最推荐的岗位！`);

  } catch (error) {
    console.error('智能选岗异常：', error);
    ElMessage.error('智能选岗失败，请重试！');
  } finally {
    loading.value = false;
  }
};

/**
 * 显示下一个低分岗位
 */
const showNextSmartPosition = () => {
  if (currentSmartIndex.value >= smartFilteredList.value.length - 1) {
    ElMessage.warning('已是最后一个岗位！');
    return;
  }

  currentSmartIndex.value += 1;
  const nextPosition = smartFilteredList.value[currentSmartIndex.value];
  
  Object.keys(currentPosition).forEach(key => delete currentPosition[key]);
  Object.assign(currentPosition, JSON.parse(JSON.stringify(nextPosition)));
  
  ElMessage.success(`已切换到第 ${currentSmartIndex.value + 1} 个推荐岗位！`);
};

// 初始化加载
onMounted(() => {
  getPositionList();
});
</script>

<style scoped>
.position-container {
  padding: 20px;
  background: #fff;
  min-height: calc(100vh - 60px);
}

/* 筛选栏样式 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 15px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

/* 返回按钮样式 */
.back-btn {
  margin-right: 20px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-weight: 500;
  color: #333;
}

/* 按钮区域样式 */
.filter-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

/* 表格容器 */
.position-table-wrapper {
  border: 1px solid #e6e8eb;
  border-radius: 8px;
  overflow: hidden;
}

/* 分页样式 */
.pagination-wrapper {
  padding: 15px 20px;
  text-align: right;
  background: #f8f9fa;
  border-top: 1px solid #e6e8eb;
}

/* 批量操作栏 */
.batch-actions {
  margin-top: 15px;
  padding: 10px 20px;
  background: #f0f7ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.batch-actions span {
  color: #165dff;
  font-weight: 500;
}

/* 专业要求tooltip样式 */
.major-tooltip {
  cursor: pointer;
  color: #165dff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 详情弹窗样式 */
:deep(.el-descriptions) {
  --el-descriptions-label-width: 120px;
}

:deep(.el-descriptions-item__label) {
  font-weight: 500;
}

/* 智能选岗结果提示 */
.smart-result-tip {
  margin-bottom: 15px;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .filter-bar {
    gap: 15px;
  }
  
  .filter-item {
    width: 45%;
    margin-bottom: 10px;
  }
  
  .back-btn {
    width: 100%;
    margin-right: 0;
    margin-bottom: 10px;
  }
  
  .filter-actions {
    width: 100%;
    margin-left: 0;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .filter-item {
    width: 100%;
  }
  
  .position-container {
    padding: 10px;
  }
}
</style>